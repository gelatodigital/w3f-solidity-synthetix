// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;
import "hardhat/console.sol";

interface IFeePool {
    function feesAvailable(
        address account
    ) external view returns (uint256, uint256);

    function isFeesClaimable(address account) external view returns (bool);

    function totalRewardsAvailable() external view returns (uint);

    function claimOnBehalf(address claimingForAddress) external returns (bool);
}

interface IDelegateApprovals {
    function canClaimFor(
        address authoriser,
        address delegate
    ) external view returns (bool);
}

interface IProxy {
    function target() external view returns (address);
}

interface IOpsProxyFactory {
    function getProxyOf(address account) external view returns (address, bool);
}

contract SnxResolver {
    address private constant OPS_PROXY_FACTORY =
        address(0xC815dB16D4be6ddf2685C201937905aBf338F5D7);

    address public constant APPROVALS =
        address(0x15fd6e554874B9e70F832Ed37f231Ac5E142362f);
    address public constant FEE_POOL_PROXY =
        address(0xb440DD674e1243644791a4AdfE3A2AbB0A92d309);

    function checker(
        address _account
    ) external view returns (bool, bytes memory execPayload) {
        IFeePool feePool = IFeePool(IProxy(FEE_POOL_PROXY).target());

        IDelegateApprovals approvals = IDelegateApprovals(APPROVALS);

        (address dedicatedMsgSender, ) = IOpsProxyFactory(OPS_PROXY_FACTORY)
            .getProxyOf(_account);
            
        (uint256 totalFees, uint256 totalRewards) = feePool.feesAvailable(
            _account
        );
        if (totalFees == 0 && totalRewards == 0) {
            execPayload = bytes("No fees to claim");
            return (false, execPayload);
        }
        uint256 totaRewardsAvailable = feePool.totalRewardsAvailable();
        if (totaRewardsAvailable == 0) {
            execPayload = bytes("No Rewards to claim");
            return (false, execPayload);
        }

        if (!feePool.isFeesClaimable(_account)) {
            execPayload = bytes("Not claimable, cRatio too low");
            return (false, execPayload);
        }

        if (!approvals.canClaimFor(_account, dedicatedMsgSender)) {
            execPayload = bytes("Not approved for claiming");
            return (false, execPayload);
        }

        execPayload = abi.encodeWithSelector(
            feePool.claimOnBehalf.selector,
            _account
        );

        return (true, execPayload);
    }
}
