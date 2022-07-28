// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "./BridgedPolygonNORI.sol";
import "./Removal.sol";
import {RestrictedNORILib, Schedule} from "./RestrictedNORILib.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import {ArrayLengthMismatch} from "./Errors.sol";

// todo Is this fully addressed: https://github.com/nori-dot-eco/contracts/pull/249/files#r906867575

/** View information for the current state of one schedule */
struct ScheduleSummary {
  uint256 scheduleTokenId;
  uint256 startTime;
  uint256 endTime;
  uint256 totalSupply;
  uint256 totalClaimableAmount;
  uint256 totalClaimedAmount;
  uint256 totalQuantityRevoked;
  address[] tokenHolders;
  bool exists; // todo remove the `exists` property from the `ScheduleSummary` struct and infer it instead
}

/** View information for one account's ownership of a schedule */
struct ScheduleDetailForAddress {
  address tokenHolder;
  uint256 scheduleTokenId;
  uint256 balance;
  uint256 claimableAmount;
  uint256 claimedAmount;
  uint256 quantityRevoked;
}

/**
 * @title A wrapped BridgedPolygonNORI token contract for restricting the release of tokens for use as insurance
 * collateral.
 *
 * @author Nori Inc.
 *
 * @notice Based on the mechanics of a wrapped ERC-20 token, this contract layers schedules over the withdrawal
 * functionality to implement _restriction_, a time-based release of tokens that, until released, can be reclaimed
 * by Nori to enforce the permanence guarantee of carbon removals.
 *
 * ##### Behaviors and features
 *
 * ###### Schedules
 *
 * - _Schedules_ define the release timeline for restricted tokens.
 * - A specific schedule is associated with one ERC1155 token id and can have multiple token holders.
 *
 * ###### Restricting
 *
 * - _Restricting_ is the process of gradually releasing tokens that may need to be recaptured by Nori in the event
 * that the sequestered carbon for which the tokens were exchanged is found to violate its permanence guarantee.
 * In this case, tokens need to be recaptured to mitigate the loss and make the original buyer whole by using them to
 * purchase new NRTs on their behalf.
 * - Tokens are released linearly from the schedule's start time until its end time. As NRTs are sold, proceeds may
 * be routed to a restriction schedule at any point in the schedule's timeline, thus increasing the total balance of
 * the schedule as well as the released amount at the current timestamp (assuming it's after the schedule start time).
 *
 * ###### Transferring
 * - A given schedule is a logical overlay to a specific 1155 token. This token can have any number of token holders,
 * and transferability via `safeTransferFrom` and `safeBatchTransferFrom` is enabled.
 * Ownership percentages only become relevant and are enforced during withdrawal and revocation.
 *
 * ###### Withdrawal
 * _Withdrawal_ is the process of a token holder claiming the tokens that have been released by the restriction
 * schedule. When tokens are withdrawn, the 1155 schedule token is burned, and the BridgedPolygonNORI being held
 * by this contract is sent to the address specified by the token holder performing the withdrawal.
 * Tokens are released by a schedule based on the linear release of the schedule's totalSupply, but a token holder
 * can only withdraw released tokens in proportion to their percentage ownership of the schedule tokens.
 *
 * ###### Revocation
 * _Revocation_ is the process of tokens being recaptured by Nori to enforce carbon permanence guarantees.
 * Only unreleased tokens can ever be revoked. When tokens are revoked from a schedule, the current number of released
 * tokens does not decrease, even as the schedule's total supply decreases through revocation (a floor is enforced).
 * When these tokens are revoked, the 1155 schedule token is burned, and the BridgedPolygonNORI held by this contract
 * is sent to the address specified by Nori. If a schedule has multiple token holders, tokens are burned from each
 * holder in proportion to their total percentage ownership of the schedule.
 *
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 *   - all functions that mutate state are pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - SCHEDULE_CREATOR_ROLE
 *      - Can create restriction schedules without sending BridgedPolygonNORI to the contract
 *      - The Market contract has this role and sets up relevant schedules as removal tokens are listed for sale
 *    - MINTER_ROLE
 *      - Can call `mint` on this contract, which mints tokens of the correct schedule id (token id) for a given removal
 *      - The Market contract has this role and can mint RestrictedNORI while routing sale proceeds to this contract
 *    - TOKEN_REVOKER_ROLE
 *      - Can revoke unreleased tokens from a schedule
 *      - Only Nori admin wallet should have this role
 *    - PAUSER_ROLE
 *      - Can pause and unpause the contract
 *    - DEFAULT_ADMIN_ROLE
 *      - This is the only role that can add/revoke other accounts to any of the roles
 *
 * ##### Inherits
 *
 * - [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements
 *
 * - [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses
 *
 * - [RemovalIdLib](./RemovalIdLib.md) for uint256
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract RestrictedNORI is ERC1155SupplyUpgradeable, PausableAccessPreset {
  using RestrictedNORILib for Schedule;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  error RecipientCannotBeZeroAddress();
  error NonexistentSchedule(uint256 scheduleId);
  error InsufficientUnreleasedTokens(uint256 scheduleId);
  error InsufficientClaimableBalance(address account, uint256 scheduleId);
  error InvalidMinter(address account);
  error InvalidZeroDuration();

  /**
   * @notice Role conferring creation of schedules.
   *
   * @dev The Market contract is granted this role after deployments.
   */
  bytes32 public constant SCHEDULE_CREATOR_ROLE =
    keccak256("SCHEDULE_CREATOR_ROLE");

  /**
   * @notice Role conferring sending of bpNori to this contract.
   *
   * @dev The Market contract is granted this role after deployments.
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice Role conferring revocation of restricted tokens.
   *
   * @dev Only Nori admin addresses should have this role.
   */
  bytes32 public constant TOKEN_REVOKER_ROLE = keccak256("TOKEN_REVOKER_ROLE");

  mapping(uint256 => mapping(uint256 => uint256))
    private _methodologyAndVersionToScheduleDuration;

  mapping(uint256 => Schedule) private _scheduleIdToScheduleStruct;

  EnumerableSetUpgradeable.UintSet private _allScheduleIds;

  /**
   * @notice The BridgedPolygonNORI contract for which this contract wraps tokens.
   */
  BridgedPolygonNORI private _bridgedPolygonNori;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  Removal private _removal;

  /**
   * @notice Emitted on successful creation of a new schedule.
   */
  event ScheduleCreated(
    uint256 indexed projectId,
    uint256 startTime,
    uint256 endTime
  );

  /**
   * @notice Emitted when unreleased tokens of an active schedule are revoked.
   */
  event TokensRevoked(
    uint256 indexed atTime,
    uint256 indexed scheduleId,
    uint256 quantity,
    address[] scheduleOwners,
    uint256[] quantitiesBurned
  );

  /**
   * @notice Emitted on withdrawal of released tokens.
   */
  event TokensClaimed(
    address indexed from,
    address indexed to,
    uint256 indexed scheduleId,
    uint256 quantity
  );

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    __ERC1155_init_unchained(
      "https://nori.com/api/restrictionschedule/{id}.json" // todo finalize rNori uri if it needs one
    );
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(SCHEDULE_CREATOR_ROLE, _msgSender());
    _grantRole(TOKEN_REVOKER_ROLE, _msgSender());
    setRestrictionDurationForMethodologyAndVersion({
      methodology: 1,
      methodologyVersion: 0,
      durationInSeconds: 315_569_520 // Seconds in 10 years (accounts for leap years)
    });
  }

  // View functions and getters =========================================
  /**
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @notice Returns the schedule duration in seconds that has been set for a given methodology and methodology version.
   */
  function getRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion
  ) public view returns (uint256) {
    return
      _methodologyAndVersionToScheduleDuration[methodology][methodologyVersion];
  }

  /**
   * @notice Returns an array of all existing schedule ids, regardless of the status of the schedule.
   */
  function getAllScheduleIds() external view returns (uint256[] memory) {
    uint256[] memory allScheduleIdsArray = new uint256[](
      _allScheduleIds.length()
    );
    for (uint256 i = 0; i < allScheduleIdsArray.length; i++) {
      allScheduleIdsArray[i] = _allScheduleIds.at(i);
    }
    return allScheduleIdsArray;
  }

  /** @notice
   * Returns an account-specific view of the details of a specific schedule.
   */
  function getScheduleDetailForAccount(address account, uint256 scheduleId)
    public
    view
    returns (ScheduleDetailForAddress memory)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      ScheduleDetailForAddress(
        account,
        scheduleId,
        balanceOf(account, scheduleId),
        schedule._claimableBalanceForScheduleForAccount(
          scheduleId,
          account,
          totalSupply(scheduleId),
          balanceOf(account, scheduleId)
        ),
        schedule.claimedAmountsByAddress[account],
        schedule.quantitiesRevokedByAddress[account]
      );
  }

  /**
   * @notice Returns an account-specific view of the details of specified schedules.
   */
  function batchGetScheduleDetailsForAccount(
    address account,
    uint256[] memory scheduleIds
  ) external view returns (ScheduleDetailForAddress[] memory) {
    ScheduleDetailForAddress[]
      memory scheduleDetails = new ScheduleDetailForAddress[](
        scheduleIds.length
      );
    for (uint256 i = 0; i < scheduleIds.length; i++) {
      if (_scheduleIdToScheduleStruct[scheduleIds[i]].exists) {
        scheduleDetails[i] = getScheduleDetailForAccount(
          account,
          scheduleIds[i]
        );
      }
    }
    return scheduleDetails;
  }

  /**
   * @notice Returns summary struct for a schedule.
   */
  function getScheduleSummary(uint256 scheduleId)
    public
    view
    returns (ScheduleSummary memory)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    uint256 numberOfTokenHolders = schedule.tokenHolders.length();
    address[] memory tokenHoldersArray = new address[](numberOfTokenHolders);
    uint256[] memory scheduleIdArray = new uint256[](numberOfTokenHolders);
    for (uint256 i = 0; i < schedule.tokenHolders.length(); i++) {
      tokenHoldersArray[i] = schedule.tokenHolders.at(i);
      scheduleIdArray[i] = scheduleId;
    }
    return
      ScheduleSummary(
        scheduleId,
        schedule.startTime,
        schedule.endTime,
        totalSupply(scheduleId),
        schedule._claimableBalanceForSchedule(
          scheduleId,
          totalSupply(scheduleId)
        ),
        schedule.totalClaimedAmount,
        schedule.totalQuantityRevoked,
        tokenHoldersArray,
        schedule.exists
      );
  }

  /**
   * @notice Returns an array of summary structs for the specified schedules.
   */
  function batchGetScheduleSummaries(uint256[] calldata scheduleIds)
    external
    view
    returns (ScheduleSummary[] memory)
  {
    ScheduleSummary[] memory scheduleSummaries = new ScheduleSummary[](
      scheduleIds.length
    );
    for (uint256 i = 0; i < scheduleIds.length; i++) {
      scheduleSummaries[i] = getScheduleSummary(scheduleIds[i]);
    }
    return scheduleSummaries;
  }

  /**
   * @notice Released balance less the total claimed amount at current block timestamp for a schedule.
   */
  function claimableBalanceForSchedule(uint256 scheduleId)
    external
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      schedule._claimableBalanceForSchedule(
        scheduleId,
        totalSupply(scheduleId)
      );
  }

  /**
   * @notice A single account's claimable balance at current block timestamp for a schedule
   *
   * @dev calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   */
  function claimableBalanceForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) external view returns (uint256) {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      schedule._claimableBalanceForScheduleForAccount(
        scheduleId,
        account,
        totalSupply(scheduleId),
        balanceOf(account, scheduleId)
      );
  }

  /**
   * @notice Returns the current number of revocable tokens for a given schedule at the current block timestamp.
   */
  function revocableQuantityForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    uint256 totalSupply = totalSupply(scheduleId);
    return schedule._revocableQuantityForSchedule(scheduleId, totalSupply);
  }

  // External functions ===================================================

  /**
   * @notice Registers the addresses of the market, bpNori, and removal contracts in this contract.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   */
  function registerContractAddresses(BridgedPolygonNORI bpNori, Removal removal)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _bridgedPolygonNori = BridgedPolygonNORI(bpNori);
    _removal = Removal(removal);
  }

  /**
   * @dev Sets the duration in seconds that should be applied to schedules created on behalf of removals
   * originating from the given methodology and methodology version.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`.
   */
  function setRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 durationInSeconds
  ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    if (durationInSeconds == 0) {
      revert InvalidZeroDuration();
    }
    _methodologyAndVersionToScheduleDuration[methodology][
      methodologyVersion
    ] = durationInSeconds;
  }

  /**
   * @notice Sets up a restriction schedule with parameters determined from the project ID.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role.
   */
  function createSchedule(uint256 projectId)
    external
    whenNotPaused
    onlyRole(SCHEDULE_CREATOR_ROLE)
  {
    if (!_scheduleIdToScheduleStruct[projectId].exists) {
      _createSchedule(projectId);
    }
  }

  /**
   * @dev Mints RestrictedNORI to the correct schedule token ID for a given removal token ID. // todo improve wording
   */
  function mint(uint256 amount, uint256 removalId) external {
    if (!hasRole(MINTER_ROLE, _msgSender())) {
      revert InvalidMinter({account: _msgSender()});
    }
    uint256 projectId = _removal.getProjectIdForRemoval(removalId);
    ScheduleData memory scheduleData = _removal.getScheduleDataForProjectId(
      projectId
    );
    address recipient = scheduleData.supplierAddress;
    super._mint(recipient, projectId, amount, "");
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    // slither-disable-next-line unused-return address may already be in set and that is ok
    schedule.tokenHolders.add(recipient);
  }

  /**
   * @notice Claim released tokens and withdraw them to `recipient` address.
   *
   * @dev This function burns `amount` of `RestrictedNORI` for the given schedule id
   * and transfers `amount` of `BridgedPolygonNORI` from the `RestrictedNORI` contract's
   * balance to `recipient`'s balance.
   *
   * Enforcement of the availability of claimable tokens
   * for the `_burn` call happens in `_beforeTokenTransfer`
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   */
  function withdrawFromSchedule(
    address recipient,
    uint256 scheduleId,
    uint256 amount
  ) external returns (bool) {
    super._burn(_msgSender(), scheduleId, amount);
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    schedule.totalClaimedAmount += amount;
    schedule.claimedAmountsByAddress[_msgSender()] += amount;
    emit TokensClaimed(_msgSender(), recipient, scheduleId, amount);
    _bridgedPolygonNori.transfer(recipient, amount);
    return true;
  }

  /**
   * @notice Transfers `amount` tokens of token type `id` from `from` to `to`.
   *
   * @dev [See the OZ ERC1155 documentation for more] (
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
   * #ERC1155-safeTransferFrom-address-address-uint256-uint256-bytes-)
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public override {
    super.safeTransferFrom(from, to, id, amount, data);
    Schedule storage schedule = _scheduleIdToScheduleStruct[id];
    if (amount != 0) {
      // slither-disable-next-line unused-return address may already be in set and that is ok
      schedule.tokenHolders.add(to);
    }
    if (balanceOf(from, id) == 0) {
      // slither-disable-next-line unused-return return value irrelevant, address guaranteed removed
      schedule.tokenHolders.remove(from);
    }
  }

  /**
   * @notice Batched version of `safeTransferFrom`.
   *
   * @dev [See the OZ ERC1155 documentation for more] (
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
   * #IERC1155-safeBatchTransferFrom-address-address-uint256---uint256---bytes-)
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    super.safeBatchTransferFrom(from, to, ids, amounts, data);
    for (uint256 i = 0; i < ids.length; i++) {
      Schedule storage schedule = _scheduleIdToScheduleStruct[ids[i]];
      if (amounts[i] != 0) {
        // slither-disable-next-line unused-return address may already be in set and that is ok
        schedule.tokenHolders.add(to);
      }
      if (balanceOf(from, ids[i]) == 0) {
        // slither-disable-next-line unused-return return value irrelevant, address guaranteed removed
        schedule.tokenHolders.remove(from);
      }
    }
  }

  /**
   * @notice Revokes amount of tokens from the specified project (schedule) id and transfers to toAccount.
   *
   * @dev The behavior of this function can be used in two specific ways:
   * - To revoke a specific number of tokens as specified by the `amount` parameter.
   * - To revoke all remaining revokable tokens in a schedule by specifying 0 as the `amount`.
   *
   * Transfers any unreleased tokens in the specified schedule and reduces the total supply
   * of that token. Only unreleased tokens can be revoked from a schedule and no change is made to
   * balances that have released but not yet been claimed.
   * If a token has multiple owners, balances are burned proportionally to ownership percentage,
   * summing to the total amount being revoked.
   * Once the tokens have been revoked, the current released amount can never fall below
   * its current level, even if the linear release schedule of the new amount would cause
   * the released amount to be lowered at the current timestamp (a floor is established).
   *
   * Unlike in the `withdrawFromSchedule` function, here we burn `RestrictedNORI`
   * from the schedule owner but send that `BridgedPolygonNORI` back to Nori's
   * treasury or an address of Nori's choosing (the *toAccount* address).
   * The *claimedAmount* is not changed because this is not a claim operation.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `TOKEN_REVOKER_ROLE`
   * - The requirements of _beforeTokenTransfer apply to this function
   */
  function revokeUnreleasedTokens(
    uint256 projectId,
    uint256 amount,
    address toAccount
  ) external whenNotPaused onlyRole(TOKEN_REVOKER_ROLE) {
    // slither-disable-next-line calls-loop choose to get the project id from the removal contract
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    if (!schedule.exists) {
      revert NonexistentSchedule({scheduleId: projectId});
    }
    uint256 quantityRevocable = schedule._revocableQuantityForSchedule(
      projectId,
      totalSupply(projectId)
    );
    if (!(amount <= quantityRevocable)) {
      revert InsufficientUnreleasedTokens({scheduleId: projectId});
    }
    // amount of zero indicates revocation of all remaining tokens.
    uint256 quantityToRevoke = amount > 0 ? amount : quantityRevocable;
    // burn correct proportion from each token holder
    address[] memory tokenHoldersLocal = schedule.tokenHolders.values();
    // todo (Gas Optimization): is it more expensive to call balanceOf multiple times, or to construct this array?
    uint256[] memory scheduleIdsForBalanceOfBatch = new uint256[](
      tokenHoldersLocal.length
    );
    for (uint256 i = 0; i < tokenHoldersLocal.length; i++) {
      scheduleIdsForBalanceOfBatch[i] = projectId;
    }
    uint256[] memory quantitiesToBurnForHolders = new uint256[](
      tokenHoldersLocal.length
    );
    // Calculate the final holder's quantity to revoke by subtracting the sum of other quantities
    // from the desired total to revoke, thus avoiding any precision rounding errors from affecting
    // the total quantity revoked by up to several wei.
    uint256[] memory accountBalances = balanceOfBatch(
      tokenHoldersLocal,
      scheduleIdsForBalanceOfBatch
    );
    uint256 cumulativeQuantityToBurn = 0;
    for (uint256 i = 0; i < (tokenHoldersLocal.length - 1); i++) {
      uint256 quantityToBurnForHolder = _quantityToRevokePerTokenHolder(
        quantityToRevoke,
        projectId,
        schedule,
        tokenHoldersLocal[i],
        accountBalances[i]
      );
      quantitiesToBurnForHolders[i] = quantityToBurnForHolder;
      cumulativeQuantityToBurn += quantityToBurnForHolder;
    }
    quantitiesToBurnForHolders[tokenHoldersLocal.length - 1] =
      quantityToRevoke -
      cumulativeQuantityToBurn;
    // todo use multicall to batch burn rNori outside of loop
    for (uint256 i = 0; i < (tokenHoldersLocal.length); i++) {
      super._burn(
        tokenHoldersLocal[i],
        projectId,
        quantitiesToBurnForHolders[i]
      );
      schedule.quantitiesRevokedByAddress[
        tokenHoldersLocal[i]
      ] += quantitiesToBurnForHolders[i];
    }
    schedule.totalQuantityRevoked += quantityToRevoke;
    emit TokensRevoked(
      block.timestamp, // solhint-disable-line not-rely-on-time, this is time-dependent
      projectId,
      quantityToRevoke,
      tokenHoldersLocal,
      quantitiesToBurnForHolders
    );
    _bridgedPolygonNori.transfer(toAccount, quantityToRevoke);
  }

  // Private implementations ==========================================
  /**
   * @notice Sets up a schedule for the specified project.
   *
   * @dev Schedules are created when removal tokens are listed for sale in the market contract,
   * so this should only be invoked during `tokensReceived` in the exceptional case that
   * tokens were sent to this contract without a schedule set up.
   *
   * Revert strings are used instead of custom errors here for proper surfacing
   * from within the market contract `onERC1155BatchReceived` hook.
   */
  function _createSchedule(uint256 projectId) internal {
    ScheduleData memory scheduleData = _removal.getScheduleDataForProjectId(
      projectId
    );
    require(scheduleData.startTime != 0, "rNORI: Invalid start time");
    address recipient = scheduleData.supplierAddress;
    if (recipient == address(0)) {
      revert RecipientCannotBeZeroAddress();
    }
    require(_allScheduleIds.add(projectId), "rNORI: Schedule exists");
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    uint256 restrictionDuration = getRestrictionDurationForMethodologyAndVersion(
        scheduleData.methodology,
        scheduleData.methodologyVersion
      );
    require(restrictionDuration != 0, "rNORI: duration not set");
    schedule.exists = true;
    schedule.startTime = scheduleData.startTime;
    schedule.endTime = scheduleData.startTime + restrictionDuration;
    emit ScheduleCreated(projectId, schedule.startTime, schedule.endTime);
  }

  /**
   * @notice Hook that is called before any token transfer. This includes minting and burning, as well as batched
   * variants.
   *
   * @dev Follows the rules of hooks defined [here](
   * https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * See the ERC1155 specific version [here](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
   * #ERC1155-_beforeTokenTransfer-address-address-address-uint256---uint256---bytes-)
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   * - One of the following must be true:
   *    - the operation is a mint (which should ONLY occur when BridgedPolygonNORI is being wrapped via `_depositFor`)
   *    - the operation is a burn, which only happens during revocation and withdrawal:
   *      - if the operation is a revocation, that permission is enforced by the TOKEN_REVOKER_ROLE
   *      - if the operation is a withdrawal the burn amount must be <= the sender's claimable balance
   *    - the operation is a transfer and _all_ of the following must be true:
   *      - the operator is operating on their own balance (enforced in the inherited contract)
   *      - the operator has sufficient balance to transfer (enforced in the inherited contract)
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override(ERC1155SupplyUpgradeable) whenNotPaused {
    bool isBurning = to == address(0);
    bool isWithdrawing = isBurning && from == operator;
    if (isBurning) {
      for (uint256 i = 0; i < ids.length; i++) {
        uint256 id = ids[i];
        Schedule storage schedule = _scheduleIdToScheduleStruct[id];
        if (isWithdrawing) {
          if (
            amounts[i] >
            schedule._claimableBalanceForScheduleForAccount(
              id,
              from,
              totalSupply(id),
              balanceOf(from, id)
            )
          ) {
            revert InsufficientClaimableBalance({
              account: from,
              scheduleId: id
            });
          }
        }
        schedule.releasedAmountFloor = schedule
          ._releasedBalanceOfSingleSchedule(totalSupply(id));
      }
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  /**
   * @dev Calculates the number of tokens that should be revoked from a given token holder and schedule based on their
   * proportion of ownership of that schedule's tokens and the total number of tokens being revoked.
   */
  function _quantityToRevokePerTokenHolder(
    uint256 totalQuantityToRevoke,
    uint256 scheduleId,
    Schedule storage schedule,
    address account,
    uint256 balanceOfAccount
  ) private view returns (uint256) {
    uint256 scheduleTrueTotal = schedule._scheduleTrueTotal(
      totalSupply(scheduleId)
    );
    uint256 revocableForAccount;
    // avoid division by or of 0
    if (scheduleTrueTotal == 0 || totalQuantityToRevoke == 0) {
      revocableForAccount = 0;
    } else {
      uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[
        account
      ];
      revocableForAccount =
        ((claimedAmountForAccount + balanceOfAccount) *
          (totalQuantityToRevoke)) /
        scheduleTrueTotal;
    }

    return revocableForAccount;
  }
}