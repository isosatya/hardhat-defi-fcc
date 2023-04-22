import { ethers, getNamedAccounts } from 'hardhat';

export const AMOUNT = ethers.utils.parseEther('0.01');

export const getWeth = async function () {
  const { deployer } = await getNamedAccounts();
  // call the "deposit" function on the weth contract
  // abi, contract address
  // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

  // here we see that getContractAt deploys a certain ABI (IWeth), from
  // a specific contract address (WETH Mainnet Contract / WETH Token)
  // using our deployer settings --> We are TOKENAZING our ETH
  const iWeth = await ethers.getContractAt(
    'IWeth',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    deployer
  );

  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Deployer got balanceOf: ${wethBalance.toString()} WETH`);
};
