import 'tsconfig-paths/register';
import '@/config/environment';
import '@/plugins';

import type { HardhatUserConfig } from 'hardhat/types';
import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';

import * as contractsConfig from './contracts.json';

import { etherscan } from '@/config/etherscan';
import { tenderly } from '@/config/tenderly';
import { networks } from '@/config/networks';
import { namedAccounts } from '@/config/accounts';
import { defender } from '@/config/defender';
import { gasReporter } from '@/config/gas-reporter';
import { solidity } from '@/config/solidity';
import { docgen } from '@/config/docgen';
import { log } from '@/utils/log';

export const config: HardhatUserConfig = {
  tenderly,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  docgen,
  namedAccounts,
  networks,
  etherscan,
  defender,
  gasReporter,
  solidity,
};

// todo move to @/extensions/signers, @extensions/deployments
extendEnvironment(async (hre) => {
  const accounts = (await hre.getNamedAccounts()) as NamedAccounts;
  const namedSigners: NamedSigners = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([accountName, address]) => {
        return [accountName, await hre.waffle.provider.getSigner(address)];
      })
    )
  );
  hre.namedSigners = namedSigners;
  hre.namedAccounts = accounts;
  hre.ethernalSync = Boolean(
    hre.network.name === 'hardhat' &&
      process.env.ETHERNAL &&
      process.env.ETHERNAL !== 'false' &&
      process.env.ETHERNAL_EMAIL &&
      process.env.ETHERNAL_PASSWORD
  );
  if (
    ['hardhat', 'localhost'].includes(hre.network.name) &&
    process.env.LOG &&
    process.env.LOG !== 'false'
  ) {
    await hre.network.provider.send('hardhat_setLoggingEnabled', [true]);
  }
  if (hre.network.name === 'hardhat') {
    if (hre.ethernalSync) {
      hre.ethernalWorkspace = 'nori';
      hre.ethernalTrace = true;
    } else {
      hre.ethernalTrace = false;
    }
  }

  const deployOrUpgradeProxy = async <
    TContract extends BaseContract,
    TFactory extends ContractFactory
  >({
    contractName,
    args,
    options,
  }: {
    contractName: ContractNames;
    args: unknown[];
    options?: DeployProxyOptions;
  }): Promise<InstanceOfContract<TContract>> => {
    // todo use proposeUpgrade
    const proxyAddress =
      contractsConfig[hre.network.name as 'hardhat']?.[contractName]
        ?.proxyAddress;
    const contractCode = await hre.ethers.provider.getCode(proxyAddress);
    let contract: InstanceOfContract<TContract>;
    const contractFactory = await hre.ethers.getContractFactory<TFactory>(
      contractName
    );
    const forceProxyDeployment =
      process.env.FORCE_PROXY_DEPLOYMENT &&
      process.env.FORCE_PROXY_DEPLOYMENT !== 'false';
    if (contractCode === '0x' || forceProxyDeployment) {
      log('Deploying proxy and instance', contractName);
      contract = await hre.upgrades.deployProxy<TContract>(
        contractFactory,
        args,
        options
      );
      log('Deployed proxy and instance', contractName, contract.address);
    } else {
      log('Found existing proxy, attempting to upgrade instance', contractName);
      contract = await hre.upgrades.upgradeProxy<TContract>(
        proxyAddress,
        contractFactory
        // options
      );
      log('Upgraded instance', contractName, contract.address);
    }
    log('awaiting deployment transaction', contractName);
    await contract.deployed();
    log('successful deployment transaction', contractName);
    return contract;
  };
  hre.deployOrUpgradeProxy = deployOrUpgradeProxy;
});

export default config;
