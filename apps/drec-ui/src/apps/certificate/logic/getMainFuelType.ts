import { CodeNameDTO } from '@energyweb/origin-drec-api-client';

export const getMainFuelType = (fuelType: string, allTypes: CodeNameDTO[]) => {
    if (!fuelType || !allTypes) {
        return { mainType: '', restType: '' };
    }
    try {
        const decodedType = allTypes.find((type) => type.code === fuelType).name;
        const splitValue = decodedType.split(':');

        const mainType = splitValue[0];
        const restType = splitValue.length > 1 ? splitValue.slice(1).join() : '';

        return { mainType, restType };
    } catch (error) {
        console.log(error);
        throw new Error(
            `Provided device fuel type does not match with any known type. Received: ${fuelType}`
        );
    }
};
