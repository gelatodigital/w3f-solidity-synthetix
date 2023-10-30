// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

interface ISynstemSettings {
    function issuanceRatio() external view returns (uint);
}

interface IIssuer {
    function collateralisationRatio(
        address issuer
    ) external view returns (uint);
}

interface IDelegateApprovals {
    function canIssueFor(
        address authoriser,
        address delegate
    ) external view returns (bool);
}

interface ISynthetix {
   function issueMaxSynthsOnBehalf(address issueForAddress) external;
}

interface IOpsProxyFactory {
    function getProxyOf(address account) external view returns (address, bool);
}

contract SnxMintResolver {
    address private constant OPS_PROXY_FACTORY =
        address(0xC815dB16D4be6ddf2685C201937905aBf338F5D7);
    address public constant APPROVALS =
        address(0x15fd6e554874B9e70F832Ed37f231Ac5E142362f);
    address public constant ISSUER =
        address(0xca68a3D663483515a9D434E854AB59A41b3A523c);
    address public constant SYSTEM_SETTINGS =
        address(0x202ae40Bed1640b09e2AF7aC5719D129A498B7C8);
    address public constant SYNTHETIX = (
        0xd0dA9cBeA9C3852C5d63A95F9ABCC4f6eA0F9032
    );

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
}
