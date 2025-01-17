import { task } from 'hardhat/config';

import {
  CONTRACT_FUNCTION_TASK_PARAMETERS,
  CONTRACT_FUNCTION_TASK_RUN,
} from './utils/contract-functions';

import * as contractsConfig from '@/contracts.json';

export const TASK = {
  name: 'NORI',
  description: 'Interact with the NORI contract',
  run: async (
    {
      func,
      args = [],
      from = CONTRACT_FUNCTION_TASK_PARAMETERS.from.defaultValue,
    }: {
      func: ReturnType<
        typeof CONTRACT_FUNCTION_TASK_PARAMETERS.func.type.parse
      >; // todo typechain
      from?: ReturnType<
        typeof CONTRACT_FUNCTION_TASK_PARAMETERS.from.type.parse
      >;
      args?: unknown[];
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const network = hre.network.name;
    if (
      !(
        network === 'localhost' ||
        network === 'mainnet' ||
        network === 'hardhat' ||
        network === 'goerli'
      )
    ) {
      throw new Error(`Unsupported network: ${network}`);
    }
    return CONTRACT_FUNCTION_TASK_RUN({
      contractAddress: contractsConfig[network].NORI.proxyAddress,
      contractAbi: (await require('@/artifacts/NORI.sol/NORI.json')).abi,
      from,
      func,
      args,
      hre,
    });
  },
  CONTRACT_FUNCTION_TASK_PARAMETERS,
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.type
  )
  .addOptionalParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.type
  )
  .addOptionalVariadicPositionalParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.type
  );
