import { expect } from "chai";
import * as hre from "hardhat";
import {
  DelegateApprovals__factory,
  IOpsProxyFactory__factory,
  Issuer__factory,
  SystemSettings__factory,
} from "../typechain";
import * as dotenv from "dotenv";

import { SnxMintResolver__factory } from "../typechain/factories/SnxMintResolver.sol/SnxMintResolver__factory";
import {
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  DELEGATE_APPROVALs,
  IOPS_FACTORY,
  ISSUER,
  SYNTHETIX,
  SYSTEM_SETTINGS,
} from "./constants";

dotenv.config({ path: __dirname + "/.env" });
const ALCHEMY_ID = process.env.ALCHEMY_ID;

const testSnxMintResolver = async () => {

  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
          blockNumber: 18423675,
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

  const snxMintResolver = await new SnxMintResolver__factory(signer).deploy();

  // expect checker returns false with string "Not approved for Issuing"
  let checkerResult = await snxMintResolver
    .connect(dedicatedMsgSender)
    .checker(account);
  let error = hre.ethers.utils.hexlify(
    hre.ethers.utils.toUtf8Bytes("Not approved for Issuing")
  );
  expect(checkerResult[0]).false;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#No approved for issuing`
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
  let canIssue = await delegateApprovals.canIssueFor(
    account,
    dedicatedMsgSender
  );
  expect(canIssue).false;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#DedicatedMsgSender Can Issue: ${canIssue}`
  );

  // approving dedicatedMsgSender as delegator
  let approvalTx = await delegateApprovals.approveIssueOnBehalf(
    dedicatedMsgSender
  );
  await approvalTx.wait();

  canIssue = await delegateApprovals.canIssueFor(account, dedicatedMsgSender);
  expect(canIssue).true;
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#DedicatedMsgSender Can Issue: ${canIssue}`
  );

  let result = await snxMintResolver
    .connect(dedicatedMsgSenderSigner)
    .checker(account);
  expect(result[0]).to.equal(true);
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Resolver Can execute ${result[0]}`
  );

  let issuer = Issuer__factory.connect(ISSUER, signer);
  let sytemSetting = SystemSettings__factory.connect(SYSTEM_SETTINGS, signer);

  let colRatio = await issuer.collateralisationRatio(account);
  let issuanceRatio = await sytemSetting.issuanceRatio();
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Cratio - Issuance Ratio: ${
      +colRatio.toString() - +issuanceRatio.toString()
    }`
  );

  await setBalance(dedicatedMsgSender, hre.ethers.utils.parseEther("100"));

  let tx = await dedicatedMsgSenderSigner.sendTransaction({
    to: SYNTHETIX,
    data: result[1],
    value: "0",
  });

  await tx.wait();
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Tx Executed`
  );


  colRatio = await issuer.collateralisationRatio(account);
  expect(+colRatio.toString() - +issuanceRatio.toString()).equal(0);
  console.log(
    "\x1b[32m%s\x1b[0m",
    "    ✔",
    `\x1b[30m#Cratio - Issuance Ratio: ${
      +colRatio.toString() - +issuanceRatio.toString()
    }`
  );
};

testSnxMintResolver();
