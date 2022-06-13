import type { HardhatUserConfig } from 'hardhat/types';

export const getEthernalConfig = (
  environment = process.env
): HardhatUserConfig['ethernal'] => {
  const { ETHERNAL, TRACE, ETHERNAL_EMAIL, ETHERNAL_PASSWORD } = environment;
  const ethernal: HardhatUserConfig['ethernal'] =
    ETHERNAL &&
    typeof ETHERNAL_EMAIL === 'string' &&
    typeof ETHERNAL_PASSWORD === 'string' &&
    ['localhost', 'hardhat'].includes(hre.network.name)
      ? {
          email: ETHERNAL_EMAIL,
          password: ETHERNAL_PASSWORD,
          disableSync: false,
          disableTrace: TRACE,
          workspace: 'nori',
          uploadAst: true,
          disabled: false,
          resetOnStart: 'nori',
        }
      : {
          disableSync: true,
          disableTrace: true,
          uploadAst: false,
          disabled: true,
        };
  return ethernal;
};