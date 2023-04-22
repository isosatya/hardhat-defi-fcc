import { ethers, getNamedAccounts } from 'hardhat';
import { getWeth, AMOUNT } from './getWeth';
import { ILendingPool } from '../typechain-types';

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();

  // Lending Pool --> we get it from  LendingPoolAddressesProvider

  // lendingPoolAddressesProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool: ILendingPool = await getLendingPool(deployer);

  console.log(`Lending Pool Address ${lendingPool.address}`);

  // the same as the one from getWeth()
  const wethTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  // approve
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);

  console.log('Depositing....');
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log('Deposited!!!!');

  // borrowing
  // how much we have borrowed, how much we have in colaterall, how much we can borrow
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  // availableBorrowsETH? What is the conversion rate to DAI?

  const daiPrice = await getDaiPrice();

  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());

  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );

  // 0x6B175474E89094C44Da98b954EedeAC495271d0F
  const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  // we use the lendingPool object NOT the address
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);

  // we use the lendingPool object NOT the address
  await getBorrowUserData(lendingPool, deployer);

  // we use the lendingPool object NOT the address
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);

  // we use the lendingPool object NOT the address
  await getBorrowUserData(lendingPool, deployer);
}

async function repay(amount, daiTokenAddress, lendingPool, signerAccount) {
  // we need to approve the repay first
  await approveERC20(
    daiTokenAddress,
    lendingPool.address,
    amount,
    signerAccount
  );

  const repayTx = await lendingPool.repay(
    daiTokenAddress,
    amount,
    1,
    signerAccount
  );

  await repayTx.wait(1);
  console.log('You have repaied your debt!!!');
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  signerAccount
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    1,
    0,
    signerAccount
  );

  await borrowTx.wait(1);

  console.log(`You have been able to borrow ${amountDaiToBorrowWei}`);
}

async function getDaiPrice() {
  // here we don´t need the signer account argument because
  // we won´t interact with the contract
  const daiEthPriceFeed = await ethers.getContractAt(
    'AggregatorV3Interface',
    '0x773616e4d11a78f511299002da57a0a94577f1f4'
  );

  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price}`);
  return price;
}

// gets data about borrower financial health data
async function getBorrowUserData(lendingPool, signerAccount) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(signerAccount);

  console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`);
  console.log(`You can still borrow ${availableBorrowsETH} worth of ETH`);

  return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account: any) {
  // this is the MAINNET contract address for lendingPoolAddressesProvider
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    'ILendingPoolAddressesProvider',
    '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
    account
  );

  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();

  const lendingPool = await ethers.getContractAt(
    'ILendingPool',
    lendingPoolAddress,
    account
  );

  return lendingPool;
}

// this is like approve() for transferFrom() like function for an ERC20 token
async function approveERC20(
  ERC20ContractAddress,
  spenderAddress,
  amountToSpend,
  SignerAccount
) {
  const ERC20Token = await ethers.getContractAt(
    'IERC20',
    ERC20ContractAddress,
    SignerAccount
  );

  const tx = await ERC20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);

  console.log('Spending Approved!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
