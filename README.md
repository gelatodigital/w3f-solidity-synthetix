# Gelato <> Synthetix

## Problem Statement

Automatic Minting (mint when cratio > issuanceRatio)
Automatic Claiming (claim when cratio > issuanceRatio AND [TODO rewardsAvailable > 0])
 
Automatic Minting

read collateralisationRatio of address from Issuer https://etherscan.io/address/0xca68a3D663483515a9D434E854AB59A41b3A523c#readContract
read issuanceRatio from SystemSettings https://etherscan.io/address/0x202ae40Bed1640b09e2AF7aC5719D129A498B7C8#readContract
if  collateralisationRatio > issuanceRatio then
issueMaxSynthsOnBehalf (0xfd864ccf)  for address in https://etherscan.io/address/0xca68a3D663483515a9D434E854AB59A41b3A523c#writeContract 


Automatic Claiming


We have this setup on Optimism already, but want it for Ethereum https://app.gelato.network/task/0x8a370a89fa2d31b0bc46b74a198ebd43a67fc19d5133200548cd5e2e79b7e179?chainId=10&ref=blog.synthetix.io
if  collateralisationRatio >= issuanceRatio  AND [TODO: rewardsAvailable]
claimOnBehalf as in Optimism example

---

## Proposed Solution

### Automatic Minting

We have created the [SnxMintResolver](./contracts/SnxMintResolver.sol) that only executes if cRatio < insuranceRatio. It is worth noticing that by default, now the executions are routed through the dedicatedMsgSender, so we will have to approve the user's dedicatedMSgSender as the delegator and not the ops contract as before.

```typescript
   function checker(
        address _account
    ) external view returns (bool, bytes memory execPayload) {
        (address dedicatedMsgSender, ) = IOpsProxyFactory(OPS_PROXY_FACTORY)
            .getProxyOf(_account);

        uint256 cRatio = IIssuer(ISSUER).collateralisationRatio(_account);
        uint256 insuranceRatio = ISynstemSettings(SYSTEM_SETTINGS)
            .issuanceRatio();

        if (cRatio >= insuranceRatio) {
            execPayload = bytes("Mint not requested");
            return (false, execPayload);
        }

        if (
            !IDelegateApprovals(APPROVALS).canIssueFor(
                _account,
                dedicatedMsgSender
            )
        ) {
            execPayload = bytes("Not approved for Issuing");
            return (false, execPayload);
        }

        execPayload = abi.encodeWithSelector(
            ISynthetix(SYNTHETIX).issueMaxSynthsOnBehalf.selector,
            _account
        );

        return (true, execPayload);
    }
```

#### Testing

We have analyzed the block 18423676 on mainnet where following [tx](https://etherscan.io/tx/0x0313587fa285937ebb322ad40dc464123d2272d37b6d6b81b08b3caad5dd9989) to Issue Max Synths On Behalf of account (0x103f1A97147B2345ba1Dee9852f4991754425801)
So we have forked mainnet to one block before at 18423675 (one block before) and tested the resolver

1) Please add the Alchemy Mainnet Key and the PK if you want to deploy.

2) Run local hardhat node

```
npx hardhat node --network hardhat
```

3) Test
Please run the [SnxMintResolver_test](./scripts/SnxMintResolver_test.ts) with following command

```
yarn resolverMint
```
With following results
```shell
$ npx hardhat run scripts/SnxMintResolver_test.ts
    ✔ #No approved for issuing
    ✔ #DedicatedMsgSender Can Issue: false
    ✔ #DedicatedMsgSender Can Issue: true
    ✔ #Resolver Can execute true
    ✔ #Cratio - Issuance Ratio: -17707519263574688
    ✔ #Tx Executed
    ✔ #Cratio - Issuance Ratio: 0
✨  Done in 5.27s.
```
Let's go have a look into the main steps:

**get the dedicatedMsgSender**
```typescript
 const [dedicatedMsgSender] = await opsProxyFactory.getProxyOf(account);
```

**approve dedicatedMsgSender as delegator**
```typescript
   let approvalTx = await delegateApprovals.approveIssueOnBehalf(
    dedicatedMsgSender
  );
```

**checker call**
```typescript
let result = await snxMintResolver
    .connect(dedicatedMsgSenderSigner)
    .checker(account);
```

**mock transaction execution**
```typescript
  let tx = await dedicatedMsgSenderSigner.sendTransaction({
    to: SYNTHETIX,
    data: result[1],
    value: "0",
  });
```

### Automatic Claiming

We have created the [SnxResolver](./contracts/SnxResolver.sol) analog to the already existing in OP with the only amendments of using the dedicatedMsgSender as described above and the totalRewardsAvailable check.

```typescript
     uint256 totaRewardsAvailable = feePool.totalRewardsAvailable();
        if (totaRewardsAvailable == 0) {
            execPayload = bytes("No Rewards to claim");
            return (false, execPayload);
        }
```

#### Testing

We have analyzed the block 18438390 on mainnet where following [tx](https://etherscan.io/tx/0x41b080fbb5d2649901d42726257792b27a705d786529932434655feea754ac0f) to claim On Behalf of account (0x103f1A97147B2345ba1Dee9852f4991754425801)
So we have forked mainnet to one block before at 18438389 (one block before) and tested the resolver

1) Please add the Alchemy Mainnet Key and the PK if you want to deploy.

2) Run local hardhat node

```
npx hardhat node --network hardhat
```

3)  Test
Please run the [SnxResolver_test](./scripts/SnxResolver_test.ts) with following command

```
yarn resolver
```
With following results
```shell
$ npx hardhat run scripts/SnxResolver_test.ts
    ✔ #No approved for claiming
    ✔ #DedicatedMsgSender Can Claim: false
    ✔ #DedicatedMsgSender Can Claim: true
    ✔ #Resolver Can execute true
    ✔ #Tx Claiming Executed
✨  Done in 5.06s.
```
Let's go have a look into the main steps:

**get the dedicatedMsgSender**
```typescript
 const [dedicatedMsgSender] = await opsProxyFactory.getProxyOf(account);
```

**approve dedicatedMsgSender as delegator**
```typescript
  let approvalTx = await delegateApprovals.approveClaimOnBehalf(
    dedicatedMsgSender
  );
```

**checker call**
```typescript
let result = await snxResolver
    .connect(dedicatedMsgSenderSigner)
    .checker(account);
```

**mock transaction execution**
```typescript
  let tx = await dedicatedMsgSenderSigner.sendTransaction({
    to: FEE_POOL,
    data: result[1],
    value: "0",
  });

```

