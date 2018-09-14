pragma solidity ^0.4.24;

import "./UnstructuredUpgradeableTokenV0_2_0.sol";


/**
* @title UnstructuredUpgradeableTokenV0_3_0
* @dev Version 2 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV0_3_0 is UnstructuredUpgradeableTokenV0_2_0 {

  event NewStateAdded(string newStateVariable);

  function addNewState() public {
    super.addNewState();
    emit NewStateAdded("newStateVariable");
  }
  function getNewState() public view returns(string) {
    return newStateVariable;
  }
  function funcThatV2ShouldDeprecate() public pure returns(string) {
    return "V1 func of same name has been deprecated";
  }


}