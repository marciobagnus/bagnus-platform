const ARGENTINE_AREA_CODES = [
  "2901",
  "2902",
  "2903",
  "2904",
  "2905",
  "2906",
  "2908",
  "2909",
  "2920",
  "2921",
  "2922",
  "2923",
  "2924",
  "2925",
  "2926",
  "2927",
  "2928",
  "2929",
  "2931",
  "2932",
  "2933",
  "2935",
  "2936",
  "2937",
  "2938",
  "2940",
  "2942",
  "2945",
  "2946",
  "2948",
  "2952",
  "2953",
  "2954",
  "2962",
  "2963",
  "2964",
  "2966",
  "2968",
  "2972",
  "2976",
  "2983",
  "2985",
  "2986",
  "2988",
  "11",
  "220",
  "221",
  "223",
  "230",
  "236",
  "237",
  "249",
  "260",
  "261",
  "263",
  "264",
  "266",
  "280",
  "290",
  "291",
  "293",
  "294",
  "295",
  "296",
  "297",
  "298",
  "299",
  "336",
  "341",
  "342",
  "343",
  "345",
  "348",
  "351",
  "353",
  "354",
  "356",
  "358",
  "362",
  "364",
  "370",
  "373",
  "375",
  "376",
  "379",
  "380",
  "381",
  "383",
  "385",
  "387",
  "388",
] as const;

export type ArgentineMobileParts = {
  areaCode: string;
  mobileNumber: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function buildArgentineMobilePhone(
  areaCode: string,
  mobileNumber: string,
): string | null {
  const areaDigits = digitsOnly(areaCode);
  const mobileDigits = digitsOnly(mobileNumber);

  if (
    !/^\d{2,4}$/.test(areaDigits) ||
    !/^\d{6,8}$/.test(mobileDigits) ||
    areaDigits.length + mobileDigits.length !== 10
  ) {
    return null;
  }

  return `549${areaDigits}${mobileDigits}`;
}

export function parseArgentineMobilePhone(
  phone: string,
): ArgentineMobileParts | null {
  const digits = digitsOnly(phone);
  let nationalDigits = digits;

  if (digits.startsWith("549") && digits.length === 13) {
    nationalDigits = digits.slice(3);
  } else if (digits.startsWith("54") && digits.length === 12) {
    return null;
  } else {
    return null;
  }

  const areaCode = [...ARGENTINE_AREA_CODES]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => nationalDigits.startsWith(candidate));

  if (!areaCode) {
    return null;
  }

  const mobileNumber = nationalDigits.slice(areaCode.length);

  if (mobileNumber.length !== 10 - areaCode.length) {
    return null;
  }

  return { areaCode, mobileNumber };
}

export function normalizeCustomerPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = digitsOnly(trimmed);

  if (digits.startsWith("549") && digits.length === 13) {
    return digits;
  }

  if (digits.startsWith("0")) {
    const nationalDigits = digits.slice(1);
    const areaCode = [...ARGENTINE_AREA_CODES]
      .sort((left, right) => right.length - left.length)
      .find((candidate) =>
        nationalDigits.startsWith(`${candidate}15`),
      );

    if (areaCode) {
      const mobileNumber = nationalDigits.slice(areaCode.length + 2);
      const canonical = buildArgentineMobilePhone(
        areaCode,
        mobileNumber,
      );

      if (canonical) {
        return canonical;
      }
    }
  }

  if (trimmed.startsWith("+54") && /^549\d{10}$/.test(digits)) {
    return digits;
  }

  return trimmed;
}

export function getWhatsAppPhone(phone: string): string | null {
  const normalized = normalizeCustomerPhone(phone);

  if (/^549\d{10}$/.test(normalized)) {
    return normalized;
  }

  return null;
}
