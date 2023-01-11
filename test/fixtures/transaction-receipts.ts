/* eslint-disable unicorn/no-null -- this file contains fixture matching real on-chain data */

import { ethers } from 'ethers';

/**
 * A fixture that matches the transaction receipt of a real `swap` transaction on the Mumbai testnet.
 *
 * @see https://mumbai.polygonscan.com/tx/0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7
 */
export const marketSwapTransactionReceipt: ethers.providers.TransactionReceipt =
  {
    to: '0x61A9d9A34Dbc3a1accD55D684A2bF0e0D394201f',
    from: '0x465d5a3fFeA4CD109043499Fa576c3E16f918463',
    // @ts-expect-error -- the ethers type is invalid as the value is indeed null
    contractAddress: null,
    transactionIndex: 52,
    gasUsed: ethers.BigNumber.from({ type: 'BigNumber', hex: '0x091bc1' }),
    logsBloom:
      '0x4000000000000000000000000000004000000000000000000000040000000400000000000020000002000000000000000000801000000000000004000024a001000000000000000080800008001000800000000000000000000100000000000000000000020000000000000000004800080000000800000080000014001000008000000000000000000020000000000000001000000000000000000000000100220000800210000000080000000000020000000000000000000000000000004000000006000008000001000000000100020402000008000000100000000020000010000000000000000000000004000000000000000000000000880002120000',
    blockHash:
      '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
    transactionHash:
      '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
    logs: [
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000008ac7230489e80000',
        logIndex: 301,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0x897e46a477305b86F96b86671AD514E090D61A62',
        topics: [
          '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000008eb185e20a9b7b31bd48da19e834b93be952795e',
        ],
        data: '0x00000000000000000000000000000000000000000000000000000000499602d20000000000000000000000000000000000000000000000003c5694ca5238590b',
        logIndex: 302,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000004e708e3a37afa6f5',
        logIndex: 303,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x000000000000000000000000897e46a477305b86f96b86671ad514e090d61a62',
        ],
        data: '0x0000000000000000000000000000000000000000000000003c5694ca5238590b',
        logIndex: 304,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000003c5694ca5238590c',
        logIndex: 305,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x000000000000000000000000677c15a51fbea299679e6d824eb5c3da0923b4ae',
        ],
        data: '0x0000000000000000000000000000000000000000000000001219f96fe5774de9',
        logIndex: 306,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
        ],
        data: '0x0000000000000000000000000000000000000000000000000000000000000001',
        logIndex: 307,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x0000000000000000000000008eb185e20a9b7b31bd48da19e834b93be952795e',
        ],
        data: '0x0000000000000000000000000000000000000000000000003c5694ca5238590b',
        logIndex: 308,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0x8d1fd3bDF29B5F5A98b196725ef0D00DD45eFa5a',
        topics: [
          '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x00000000000000000000000061a9d9a34dbc3a1accd55d684a2bf0e0d394201f',
          '0x00000000000000000000000096107d037594cca4e7ce68f87346957bd726b3ee',
        ],
        data: '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001001007e3555349418eb185e20a9b7b31bd48da19e834b93be952795e00000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000078ad2994a470b216',
        logIndex: 309,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0x96107D037594Cca4E7ce68f87346957BD726b3EE',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000001f0ee5743d20633e9b6e3ca0cc64a87c90febc98',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ],
        data: '0x',
        logIndex: 310,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0x96107D037594Cca4E7ce68f87346957BD726b3EE',
        topics: [
          '0x71b93f608484eca5c0ce34cf649c43ec993a234dffbf78fd29d711fb47fd023c',
          '0x0000000000000000000000001f0ee5743d20633e9b6e3ca0cc64a87c90febc98',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ],
        data: '0x0000000000000000000000008d1fd3bdf29b5f5a98b196725ef0d00dd45efa5a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001001007e3555349418eb185e20a9b7b31bd48da19e834b93be952795e00000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000078ad2994a470b216',
        logIndex: 311,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
      {
        transactionIndex: 52,
        blockNumber: 28_602_256,
        transactionHash:
          '0xa4bfb9c9148b2c34bca8a496accc6cf2cb005a240d0458ada2bf7cfc82ac50b7',
        address: '0x0000000000000000000000000000000000001010',
        topics: [
          '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63',
          '0x0000000000000000000000000000000000000000000000000000000000001010',
          '0x000000000000000000000000465d5a3ffea4cd109043499fa576c3e16f918463',
          '0x0000000000000000000000003a22c8bc68e98b0faf40f349dd2b2890fae01484',
        ],
        data: '0x000000000000000000000000000000000000000000000000000ac0a5dc68d7c400000000000000000000000000000000000000000000000053a9ee73f00a39950000000000000000000000000000000000000000000000000f9d09b1b3e68637000000000000000000000000000000000000000000000000539f2dce13a161d10000000000000000000000000000000000000000000000000fa7ca57904f5dfb',
        logIndex: 312,
        blockHash:
          '0xd97a659c8e66897dcf7229c86d7229fd0f6e4f693d5c4ab22d944b89e81728b7',
      },
    ] as ethers.providers.Log[],
    blockNumber: 28_602_256,
    confirmations: 2_194_831,
    cumulativeGasUsed: ethers.BigNumber.from({
      type: 'BigNumber',
      hex: '0xa41bea',
    }),
    effectiveGasPrice: ethers.BigNumber.from({
      type: 'BigNumber',
      hex: '0x10df32885d',
    }),
    status: 1,
    type: 2,
    byzantium: true,
  };