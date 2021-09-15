import { useCertificateControllerGetAll } from '@energyweb/origin-drec-api-client';
import { ListAction } from '@energyweb/origin-ui-core';
import { useUser } from 'api';
import { useAllDeviceFuelTypes, useApiAllDevices } from 'apps/device';
import { useBlockchainInboxLogic } from 'apps/certificate/logic';
import { useBlockchainInboxPermissionsLogic } from 'apps/certificate/logic';
import {
    ListItemContent,
    ListItemHeader,
    BlockchainTransferAction,
    RetireAction
} from '../../containers';
import { useTransactionPendingStore } from '../../context';

export const useBlockchainInboxPageEffects = () => {
    const txPending = useTransactionPendingStore();

    const { data: blockchainCertificates, isLoading: areCertificatesLoading } =
        useCertificateControllerGetAll();

    const { allDevices, isLoading: areDevicesLoading } = useApiAllDevices();
    const { allTypes: allFuelTypes, isLoading: areFuelTypesLoading } = useAllDeviceFuelTypes();
    const { user, userLoading } = useUser();

    const { canAccessPage, requirementsProps } = useBlockchainInboxPermissionsLogic({
        user
    });

    const isLoading =
        areCertificatesLoading || areDevicesLoading || areFuelTypesLoading || userLoading;

    const actions: ListAction[] = [
        {
            name: 'Retire',
            component: RetireAction
        },
        {
            name: 'Transfer',
            component: BlockchainTransferAction
        }
    ];

    const listProps = useBlockchainInboxLogic({
        blockchainCertificates,
        allDevices,
        allFuelTypes,
        actions,
        ListItemHeader,
        ListItemContent
    });

    const noCertificatesText = `You don't have any certificates in the inbox`;

    return {
        isLoading,
        listProps,
        noCertificatesText,
        canAccessPage,
        requirementsProps,
        txPending
    };
};