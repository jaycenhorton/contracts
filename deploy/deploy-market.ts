import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  STAGING_NORI_FEE_WALLET_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
  STAGING_USDC_TOKEN_ADDRESS,
  PROD_USDC_TOKEN_ADDRESS,
} from '@/constants/addresses';
import { deployMarketContract, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-market`);
  const feeWallet = ['hardhat', 'localhost'].includes(hre.network.name)
    ? hre.namedAccounts.noriWallet
    : hre.network.name === 'polygon'
    ? PROD_NORI_FEE_WALLET_ADDRESS
    : STAGING_NORI_FEE_WALLET_ADDRESS;
  const deployments = await hre.deployments.all<Required<Contracts>>();
  const purchasingTokenAddress = ['hardhat', 'localhost'].includes(
    hre.network.name
  )
    ? deployments.BridgedPolygonNORI.address
    : hre.network.name === 'polygon'
    ? PROD_USDC_TOKEN_ADDRESS
    : STAGING_USDC_TOKEN_ADDRESS;

  const contract = await deployMarketContract({
    hre,
    feeWallet,
    feePercentage: 25,
    priceMultiple: 2000,
    purchasingTokenAddress,
  });
  await finalizeDeployments({ hre, contracts: { Market: contract } });
};

export default deploy;
deploy.tags = ['Market', 'market'];
deploy.dependencies = [
  'preconditions',
  'Removal',
  'Certificate',
  'BridgedPolygonNORI',
];
if (hre.network.name !== 'polygon') {
  deploy.dependencies = [...deploy.dependencies];
}
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'amoy', 'localhost', 'hardhat'].includes(hre.network.name)
  );
