import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { finalizeDeployments, deployLockedNORIContract } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-locked-nori`);
  const contract = await deployLockedNORIContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { LockedNORI: contract } });
};

export default deploy;
deploy.tags = ['LockedNORI'];
deploy.dependencies = ['BridgedPolygonNORI', 'preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'amoy', 'localhost', 'hardhat'].includes(hre.network.name)
  );
