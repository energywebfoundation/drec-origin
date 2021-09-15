import { FC } from 'react';
import { CircularProgress, Grid } from '@material-ui/core';
import { DeviceDTO } from '@energyweb/origin-drec-api-client';
import { useStyles } from './AllDevicesPage.styles';
import { useAllDevicesPageEffects } from './AllDevicesPage.effects';
import { NoDevicesOwnedCard, PublicDeviceCard } from '../../containers';

export const AllDevicesPage: FC = () => {
    const { allDevices, allDeviceTypes, isLoading } = useAllDevicesPageEffects();
    const classes = useStyles();

    if (isLoading) {
        return <CircularProgress />;
    }

    if (!isLoading && allDevices?.length === 0) {
        return <NoDevicesOwnedCard />;
    }

    return (
        <Grid container spacing={3} className={classes.wrapper}>
            {allDevices?.map((device: DeviceDTO) => (
                <Grid key={`device-${device.id}`} item>
                    <PublicDeviceCard device={device} allDeviceTypes={allDeviceTypes} />
                </Grid>
            ))}
        </Grid>
    );
};