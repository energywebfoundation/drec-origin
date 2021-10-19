import { Typography } from '@material-ui/core';
import { FC } from 'react';
import { DeviceDTO } from '@energyweb/origin-drec-api-client';
import { useStyles } from './ItemHighlightedContent.styles';
import { PowerFormatter } from 'utils';

export const ItemHighlightedContent: FC<DeviceDTO> = ({
    id,
    drecID,
    projectName,
    status,
    capacity,
    organizationId
}) => {
    const classes = useStyles();
    return (
        <div>
            <Typography variant="h6" className={classes.text} gutterBottom>
                <b>{projectName}</b>
            </Typography>
            <Typography className={classes.text} paragraph>
                Drec ID: {drecID}
            </Typography>
            <Typography className={classes.text} paragraph>
                Status: {status}
            </Typography>
            <Typography className={classes.text} paragraph>
                Capacity: {PowerFormatter.format(capacity, true)}
            </Typography>
        </div>
    );
};
