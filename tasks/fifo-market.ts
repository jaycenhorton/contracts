import { task } from 'hardhat/config';

import {
  CONTRACT_FUNCTION_TASK_PARAMETERS,
  CONTRACT_FUNCTION_TASK_RUN,
} from './utils/contract-functions';

import * as contractsConfig from '@/contracts.json';
import { abi as fifoMarketAbi } from '@/artifacts/FIFOMarket.sol/FIFOMarket.json';

export const TASK = {
  name: 'FIFOMarket',
  description: 'Interact with the FIFOMarket contract',
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
    return CONTRACT_FUNCTION_TASK_RUN({
      contractAddress:
        contractsConfig[hre.network.name].FIFOMarket.proxyAddress,
      contractAbi: fifoMarketAbi,
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
  .addVariadicPositionalParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.type
  );