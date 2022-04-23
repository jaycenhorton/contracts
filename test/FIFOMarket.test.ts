import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';

import { formatTokenAmount } from '@/utils/units';
import {
  expect,
  chai,
  mockDepositNoriToPolygon,
  setupTest,
  createRemovalTokenId,
} from '@/test/helpers';

// TODO optionally parameterize to create supply in market contract upon setup
const setupTestLocal = async (
  {
    buyerInitialBPNoriBalance = formatTokenAmount(1_000_000),
  }: { buyerInitialBPNoriBalance: BigNumberish } = {
    buyerInitialBPNoriBalance: formatTokenAmount(1_000_000),
  }
): Promise<Awaited<ReturnType<typeof setupTest>>> => {
  const { hre, contracts, ...rest } = await setupTest();

  await mockDepositNoriToPolygon({
    hre,
    contracts,
    amount: buyerInitialBPNoriBalance,
    to: hre.namedAccounts.buyer,
    signer: hre.namedSigners.buyer,
  });
  return {
    hre,
    contracts,
    ...rest,
  };
};

describe('FIFOMarket', () => {
  describe('initialization', () => {
    describe('roles', () => {
      (
        [{ role: 'DEFAULT_ADMIN_ROLE' }, { role: 'ALLOWLIST_ROLE' }] as const
      ).forEach(({ role }) => {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { fifoMarket, hre } = await setupTest();
          expect(
            await fifoMarket.hasRole(
              await fifoMarket[role](),
              hre.namedAccounts.admin
            )
          ).to.be.true;
          expect(await fifoMarket.getRoleAdmin(await fifoMarket[role]())).to.eq(
            await fifoMarket.DEFAULT_ADMIN_ROLE()
          );
          expect(
            await fifoMarket.getRoleMemberCount(await fifoMarket[role]())
          ).to.eq(1);
        });
      });
    });
  });
  describe('role access', () => {
    describe('roles', () => {
      describe('DEFAULT_ADMIN_ROLE', () => {
        [
          {
            role: 'DEFAULT_ADMIN_ROLE',
            accountWithRole: 'admin',
            accountWithoutRole: 'buyer',
          } as const,
        ].forEach(({ role, accountWithRole, accountWithoutRole }) => {
          it(`accounts with the role "${role}" can set the priority restricted threshold while accounts without this role cannot`, async () => {
            const { fifoMarket, hre } = await setupTest();

            const { namedAccounts, namedSigners } = hre;
            const roleId = await fifoMarket[role]();
            expect(
              await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole])
            ).to.be.true;

            const newThreshold = ethers.utils.parseUnits('100');

            expect(
              await fifoMarket
                .connect(namedSigners[accountWithRole])
                .setPriorityRestrictedThreshold(newThreshold)
            )
              .to.emit(fifoMarket, 'PriorityRestrictedThresholdSet')
              .withArgs(newThreshold);

            expect(await fifoMarket.priorityRestrictedThreshold()).to.equal(
              BigNumber.from(newThreshold)
            );

            await expect(
              fifoMarket
                .connect(namedSigners[accountWithoutRole])
                .setPriorityRestrictedThreshold(newThreshold)
            ).to.be.revertedWith(
              `AccessControl: account ${namedAccounts[
                accountWithoutRole
              ].toLowerCase()} is missing role ${roleId}`
            );
          });
        });
      });
      describe('ALLOWLIST_ROLE', () => {
        [
          {
            role: 'ALLOWLIST_ROLE',
            accountWithRole: 'admin',
            accountWithoutRole: 'buyer',
          } as const,
        ].forEach(({ role, accountWithRole, accountWithoutRole }) => {
          it(`accounts with the role "${role}" can purchase supply when inventory is below threshold while accounts without this role cannot`, async () => {
            const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
            const { bpNori, removal, fifoMarket, hre } = await setupTestLocal({
              buyerInitialBPNoriBalance,
            });
            const { namedAccounts, namedSigners } = hre;
            const { supplier, buyer } = hre.namedAccounts;

            const priorityRestrictedThreshold = '100';
            const totalAvailableSupply = '50';

            const packedData = hre.ethers.utils.defaultAbiCoder.encode(
              ['address', 'bool'],
              [fifoMarket.address, true]
            );
            const removalId = await createRemovalTokenId(removal, {
              supplierAddress: supplier,
            });

            await Promise.all([
              removal.mintBatch(
                supplier,
                [hre.ethers.utils.parseUnits(totalAvailableSupply)],
                [removalId],
                packedData
              ),
            ]);

            await fifoMarket.setPriorityRestrictedThreshold(
              ethers.utils.parseUnits(priorityRestrictedThreshold)
            );

            await expect(
              bpNori
                .connect(namedSigners[accountWithoutRole])
                .send(
                  fifoMarket.address,
                  hre.ethers.utils.parseUnits(totalAvailableSupply),
                  hre.ethers.utils.hexZeroPad(buyer, 32)
                )
            ).to.be.revertedWith(
              'Priority supply only and buyer not on allowlist'
            );

            const roleId = await fifoMarket[role]();
            expect(
              await fifoMarket.hasRole(
                roleId,
                namedAccounts[accountWithoutRole]
              )
            ).to.be.false;
            expect(
              await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole])
            ).to.be.true;

            await expect(
              bpNori
                .connect(namedSigners[accountWithRole])
                .send(
                  fifoMarket.address,
                  hre.ethers.utils.parseUnits(totalAvailableSupply),
                  hre.ethers.utils.hexZeroPad(buyer, 32)
                )
            ).not.to.be.reverted;
          });
        });
      });
    });
  });
  describe('Successful purchases', () => {
    it('should purchase removals and mint a certificate when there is enough supply in a single removal', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, removal, certificate, fifoMarket, hre } =
        await setupTestLocal({
          buyerInitialBPNoriBalance,
        });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const totalAvailableSupply = '100';
      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const list = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, list]
      );
      const removalId = await createRemovalTokenId(removal, {
        supplierAddress: supplier,
      });

      await Promise.all([
        removal.mintBatch(
          supplier,
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          [removalId],
          packedData
        ),
      ]);

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );

      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should purchase removals and mint a certificate for a small purchase spanning several removals', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, removal, certificate, fifoMarket, hre } =
        await setupTestLocal({
          buyerInitialBPNoriBalance,
        });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;
      const tokenIds = await Promise.all([
        createRemovalTokenId(removal, {
          supplierAddress: supplier,
          vintage: 2018,
        }),
        createRemovalTokenId(removal, {
          supplierAddress: supplier,
          vintage: 2019,
        }),
        createRemovalTokenId(removal, {
          supplierAddress: supplier,
          vintage: 2020,
        }),
      ]);
      const removalBalance1 = '3';
      const removalBalance2 = '3';
      const removalBalance3 = '4';
      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';
      const list = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, list]
      );
      await Promise.all([
        removal.mintBatch(
          supplier,
          [
            hre.ethers.utils.parseUnits(removalBalance1),
            hre.ethers.utils.parseUnits(removalBalance2),
            hre.ethers.utils.parseUnits(removalBalance3),
          ],
          tokenIds,
          packedData
        ),
      ]);

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(initialFifoSupply).to.equal(hre.ethers.utils.parseUnits('10'));
      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should purchase removals and mint a certificate for a large purchase spanning many removals', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, removal, certificate, fifoMarket, hre } =
        await setupTestLocal({
          buyerInitialBPNoriBalance,
        });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const removalBalances = [];
      let tokenIds = [];
      for (let i = 0; i <= 20; i++) {
        removalBalances.push(hre.ethers.utils.parseUnits('50'));
        tokenIds.push(
          createRemovalTokenId(removal, {
            supplierAddress: supplier,
            subIdentifier: i,
          })
        ); // use i as parcelId to ensure unique token ids
      }
      tokenIds = await Promise.all(tokenIds);

      const purchaseAmount = '1000'; // purchase all supply
      const fee = '150';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const list = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, list]
      );
      await Promise.all([
        removal.mintBatch(supplier, removalBalances, tokenIds, packedData),
      ]);

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();
      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, removal, certificate, fifoMarket, hre } =
        await setupTestLocal({
          buyerInitialBPNoriBalance,
        });
      const { namedAccounts } = hre;

      const removalBalance1 = '3';
      const removalBalance2 = '3';
      const removalBalance3 = '4';
      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const investor1InitialNoriBalance = '0';
      const investor2InitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const list = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, list]
      );
      await Promise.all([
        removal.mintBatch(
          namedAccounts.supplier,
          [hre.ethers.utils.parseUnits(removalBalance1)],
          [
            await createRemovalTokenId(removal, {
              supplierAddress: namedAccounts.supplier,
            }),
          ],
          packedData
        ),
        removal.mintBatch(
          namedAccounts.investor1,
          [hre.ethers.utils.parseUnits(removalBalance2)],
          [
            await createRemovalTokenId(removal, {
              supplierAddress: namedAccounts.investor1,
            }),
          ],
          packedData
        ),
        removal.mintBatch(
          namedAccounts.investor2,
          [hre.ethers.utils.parseUnits(removalBalance3)],
          [
            await createRemovalTokenId(removal, {
              supplierAddress: namedAccounts.investor2,
            }),
          ],
          packedData
        ),
      ]);

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(namedAccounts.buyer, 32)
        );

      const buyerFinalNoriBalance = await bpNori.balanceOf(namedAccounts.buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(
        namedAccounts.supplier
      );
      const investor1FinalNoriBalance = await bpNori.balanceOf(
        namedAccounts.investor1
      );
      const investor2FinalNoriBalance = await bpNori.balanceOf(
        namedAccounts.investor2
      );

      const noriFinalNoriBalance = await bpNori.balanceOf(
        namedAccounts.noriWallet
      );
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance1, 18))
          .toString()
      );
      expect(investor1FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor1InitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance2, 18))
          .toString()
      );
      expect(investor2FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor2InitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance3, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(namedAccounts.buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
  });

  describe('Unsuccessful purchases', () => {
    it('should revert when the queue is completely empty', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([]);

      try {
        await bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          );
      } catch (err) {
        chai.assert(err);
      }

      // no balances should change and no certificate balance should be minted
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance.toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits('0', 18)
      );
    });
    it('should revert when the non-empty queue does not have enough supply to fill the order', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, removal, certificate, fifoMarket, hre } =
        await setupTestLocal({
          buyerInitialBPNoriBalance,
        });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const totalAvailableSupply = '1';
      const purchaseAmount = '2';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const list = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, list]
      );
      await Promise.all([
        removal.mintBatch(
          supplier,
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          packedData
        ),
      ]);

      try {
        await bpNori.connect(hre.namedSigners.buyer).send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice), // todo, perform fee calculation
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        chai.assert(err);
      }

      // no balances should change and no certificate balance should be minted
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance.toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits('0', 18)
      );
    });
  });
});

// TODO: check that removals are getting burned correctly?
