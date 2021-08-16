import { LightenColor } from '../../../theme';
import { makeStyles } from '@material-ui/core';

export const useStyles = makeStyles((theme) => ({
  chip: {
    backgroundColor: LightenColor(
      theme.palette.primary.contrastText,
      -10,
      theme.palette.mode
    ),
  },
}));