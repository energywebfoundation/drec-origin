import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TimeUnitPluralEnum } from 'utils';
import { TUseGenerateChartLabelsArgs } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);

export const useGenerateChartLabels = ({
    start,
    end,
    multiplier,
    format
}: TUseGenerateChartLabelsArgs) => {
    const labels: string[] = [];
    let current = start;

    while (dayjs(current).isBefore(dayjs(end))) {
        const formatted = dayjs(current).format(format);

        const date = dayjs(current).add(multiplier, TimeUnitPluralEnum.minutes).toDate();
        labels.push(formatted);
        current = date;
    }
    return labels;
};
