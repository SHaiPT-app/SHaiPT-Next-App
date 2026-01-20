// Weight conversion utilities

export function lbsToKg(lbs: number): number {
    return lbs * 0.453592;
}

export function kgToLbs(kg: number): number {
    return kg * 2.20462;
}

export function convertWeight(
    weight: number,
    fromUnit: 'lbs' | 'kg',
    toUnit: 'lbs' | 'kg'
): number {
    if (fromUnit === toUnit) return weight;

    if (fromUnit === 'lbs' && toUnit === 'kg') {
        return lbsToKg(weight);
    } else {
        return kgToLbs(weight);
    }
}

export function formatWeight(
    weight: number,
    unit: 'lbs' | 'kg',
    userPreferredUnit: 'lbs' | 'kg'
): { value: number; unit: 'lbs' | 'kg'; display: string } {
    const convertedWeight = convertWeight(weight, unit, userPreferredUnit);
    const rounded = Math.round(convertedWeight * 10) / 10; // Round to 1 decimal

    return {
        value: rounded,
        unit: userPreferredUnit,
        display: `${rounded} ${userPreferredUnit}`
    };
}
