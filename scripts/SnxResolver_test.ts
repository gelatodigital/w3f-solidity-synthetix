import { expect } from "chai";
import * as hre from "hardhat";
import {
  DelegateApprovals__factory,
  FeePool__factory,
  IOpsProxyFactory__factory,
  SnxResolver__factory,
} from "../typechain";
import * as dotenv from "dotenv";


import {
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  DELEGATE_APPROVALs,
  FEE_POOL,
  IOPS_FACTORY,
} from "./constants";

dotenv.config({ path: __dirname + "/.env" });
const ALCHEMY_ID = process.env.ALCHEMY_ID;

const testSnxResolver = async () => {

  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
          blockNumber: 18438389,
        },
      },
    ],
  });

  let account = "0x103f1A97147B2345ba1Dee9852f4991754425801";

  // Get hardhat signer
  const signer = await hre.ethers.provider.getSigner();

  /// Impersonate dedicatedMsgSender
  const opsProxyFactory = IOpsProxyFactory__factory.connect(
    IOPS_FACTORY,
    signer
  );

  const [dedicatedMsgSender] = await opsProxyFactory.getProxyOf(account);


  await impersonateAccount(dedicatedMsgSender);
  const dedicatedMsgSenderSigner = await hre.ethers.getSigner(
    dedicatedMsgSender
  );

  const snxResolver = await new SnxResolver__factory(signer).deploy();
  

  // expect checker returns false with string "Not approved for claiming"
  let checkerResult = await snxResolver
    .connect(dedicatedMsgSender)
    .checker(account);
  let error = hre.ethers.utils.hexlify(
    hre.ethers.utils.toUtf8Bytes("Not approved for claiming")
  );
  expect(checkerResult[0]).false;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#No approved for claiming`
  );

  expect(checkerResult[1]).to.equal(error);

  // Approve dedicatedMsgSender as delegator

  await impersonateAccount(account);
  let acountSigner = await hre.ethers.getSigner(account);

  const delegateApprovals = DelegateApprovals__factory.connect(
    DELEGATE_APPROVALs,
    acountSigner
  );

  // the dedicatedMsgSender can not Issue as it is not yet approved
  let canClaim = await delegateApprovals.canClaimFor(
    account,
    dedicatedMsgSender
  );
  expect(canClaim).false;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#DedicatedMsgSender Can Claim: ${canClaim}`
  );

  // approving dedicatedMsgSender as delegator
  let approvalTx = await delegateApprovals.approveClaimOnBehalf(
    dedicatedMsgSender
  );
  await approvalTx.wait();

 
  canClaim = await delegateApprovals.canClaimFor(account, dedicatedMsgSender);
  expect(canClaim).true;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#DedicatedMsgSender Can Claim: ${canClaim}`
  );

  let result = await snxResolver
    .connect(dedicatedMsgSenderSigner)
    .checker(account);
  expect(result[0]).to.equal(true);
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Resolver Can execute${result[0]}`
  );




  await setBalance(dedicatedMsgSender, hre.ethers.utils.parseEther("100"));

  let tx = await dedicatedMsgSenderSigner.sendTransaction({
    to: FEE_POOL,
    data: result[1],
    value: "0",
  });

  await tx.wait();
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Tx Claiming Executed`
  );



};

testSnxResolver();
