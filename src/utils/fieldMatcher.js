/**
 * AutoDox AI - Field Matcher & Heuristics Engine
 *
 * Provides privacy-preserving, client-side semantic matching between
 * DOM form input elements and AutoDox Vault attributes.
 */

// Synonym dictionary mapping normalized semantic concepts to aliases & regex patterns
export const SEMANTIC_CATEGORIES = {
  fullName: {
    canonical: 'Full Legal Name',
    aliases: ['fullname', 'full_name', 'name', 'applicant_name', 'candidate_name', 'legal_name', 'your_name', 'client_name', 'employee_name', 'contact_name', 'recipient_name'],
    autocompletes: ['name'],
    regex: /\b(full\s*name|legal\s*name|applicant\s*name|candidate\s*name|your\s*name)\b/i,
    weight: 90
  },
  firstName: {
    canonical: 'First Name',
    aliases: ['firstname', 'first_name', 'fname', 'given_name', 'forename', 'first', 'givenname'],
    autocompletes: ['given-name'],
    regex: /\b(first\s*name|given\s*name|fname|forename)\b/i,
    weight: 95
  },
  lastName: {
    canonical: 'Last Name',
    aliases: ['lastname', 'last_name', 'lname', 'surname', 'family_name', 'last', 'familyname'],
    autocompletes: ['family-name'],
    regex: /\b(last\s*name|surname|family\s*name|lname)\b/i,
    weight: 95
  },
  email: {
    canonical: 'Email Address',
    aliases: ['email', 'e_mail', 'e-mail', 'email_address', 'mail', 'user_email', 'contact_email', 'electronic_mail'],
    autocompletes: ['email'],
    regex: /\b(e[-_]?mail|mail\s*address)\b/i,
    types: ['email'],
    weight: 98
  },
  phone: {
    canonical: 'Phone Number',
    aliases: ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'contact_number', 'phone_no', 'mobile_no', 'cellphone'],
    autocompletes: ['tel', 'tel-national', 'tel-country-code'],
    regex: /\b(phone|mobile|telephone|cell\s*phone|contact\s*no)\b/i,
    types: ['tel'],
    weight: 95
  },
  address: {
    canonical: 'Postal Address',
    aliases: ['address', 'street', 'street_address', 'address_line1', 'address1', 'street_addr', 'residential_address', 'home_address', 'mailing_address'],
    autocompletes: ['address-line1', 'street-address'],
    regex: /\b(address(\s*line\s*1)?|street(\s*address)?|mailing\s*address)\b/i,
    weight: 90
  },
  addressLine2: {
    canonical: 'Address Line 2',
    aliases: ['address_line2', 'address2', 'apt', 'suite', 'unit', 'building', 'floor'],
    autocompletes: ['address-line2'],
    regex: /\b(address\s*line\s*2|apt|suite|unit)\b/i,
    weight: 90
  },
  city: {
    canonical: 'City',
    aliases: ['city', 'town', 'municipality', 'locality', 'suburb'],
    autocompletes: ['address-level2'],
    regex: /\b(city|town|municipality)\b/i,
    weight: 90
  },
  state: {
    canonical: 'State / Province',
    aliases: ['state', 'province', 'region', 'state_province', 'state_code'],
    autocompletes: ['address-level1'],
    regex: /\b(state|province|region)\b/i,
    weight: 85
  },
  zip: {
    canonical: 'Zip / Postal Code',
    aliases: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode', 'pincode', 'postcode'],
    autocompletes: ['postal-code'],
    regex: /\b(zip|postal\s*code|pincode|postcode)\b/i,
    weight: 95
  },
  country: {
    canonical: 'Country / Nationality',
    aliases: ['country', 'country_name', 'nationality', 'nation', 'citizenship'],
    autocompletes: ['country', 'country-name'],
    regex: /\b(country|nationality|citizenship)\b/i,
    weight: 85
  },
  docNumber: {
    canonical: 'Document Number',
    aliases: ['docnumber', 'doc_number', 'passport', 'passport_number', 'passport_no', 'id_number', 'national_id', 'ssn', 'tax_id', 'license_no', 'identification_number'],
    autocompletes: ['id', 'ssn'],
    regex: /\b(passport(\s*no|\s*number)?|id\s*number|doc(ument)?\s*number|ssn|license(\s*no)?)\b/i,
    weight: 90
  },
  employer: {
    canonical: 'Employer / Company',
    aliases: ['employer', 'company', 'organization', 'workplace', 'company_name', 'current_employer', 'employer_name', 'firm'],
    autocompletes: ['organization'],
    regex: /\b(employer|company(\s*name)?|organization|workplace)\b/i,
    weight: 90
  },
  jobTitle: {
    canonical: 'Job Title',
    aliases: ['job_title', 'title', 'position', 'role', 'occupation', 'designation', 'current_title'],
    autocompletes: ['organization-title'],
    regex: /\b(job\s*title|position|occupation|designation|current\s*role)\b/i,
    weight: 90
  },
  dob: {
    canonical: 'Date of Birth',
    aliases: ['dob', 'birthdate', 'birth_date', 'date_of_birth', 'bday'],
    autocompletes: ['bday', 'bday-day', 'bday-month', 'bday-year'],
    regex: /\b(date\s*of\s*birth|birth\s*date|dob|bday)\b/i,
    weight: 95
  },
  issueDate: {
    canonical: 'Issue Date',
    aliases: ['issue_date', 'issued_date', 'date_of_issue', 'issued_on'],
    autocompletes: [],
    regex: /\b(issue\s*date|issued\s*(on|date)|date\s*of\s*issue)\b/i,
    weight: 90
  }
};

/**
 * Normalizes a field label or attribute label for robust matching:
 * - Converts to lowercase
 * - Trims leading and trailing whitespace
 * - Collapses repeated spaces
 * - Strips harmless punctuation (*, ?, :, ;, !, _, -, /, \, (, ), [, ], {, }, ', ", `, #, etc.)
 */
export function normalizeLabel(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[*?:;,!_.\-\/\\()[\]{}'"`“”‘’#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a string for lenient matching (lowercased, alphanumeric tokens only)
 */
export function normalizeKey(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Normalizes text for regex/search comparison
 */
export function normalizeSearchText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Universal abbreviation and canonical token dictionary for generic matching
 * across any user-created fields (e.g. Hall Ticket No -> Hall Ticket Number).
 */
export const TOKEN_CANONICAL_MAP = {
  no: 'number',
  num: 'number',
  nbr: 'number',
  nr: 'number',
  tel: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  cell: 'phone',
  cellphone: 'phone',
  contact: 'phone',
  mail: 'email',
  institution: 'college',
  institute: 'college',
  university: 'college',
  org: 'organization',
  company: 'organization',
  employer: 'organization',
  dept: 'department',
  dob: 'birthdate',
  bday: 'birthdate',
  addr: 'address',
  yr: 'year',
  id: 'number',
  identification: 'number'
};

/**
 * Common equivalent alias clusters for established field synonyms
 */
export const COMMON_FIELD_ALIASES = [
  ['name', 'full name', 'full legal name', 'legal name', 'applicant name', 'candidate name'],
  ['first name', 'given name', 'forename'],
  ['last name', 'surname', 'family name'],
  ['email', 'email address', 'e mail', 'e mail address', 'mail'],
  ['phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'cell', 'cell phone', 'contact number', 'phone no', 'mobile no', 'contact no'],
  ['hall ticket number', 'hall ticket no', 'hall ticket'],
  ['admission id', 'admission number', 'admission no'],
  ['college name', 'institution name', 'institute name', 'university name', 'college', 'institution'],
  ['date of birth', 'dob', 'birth date', 'birthdate'],
  ['address', 'permanent address', 'residential address', 'home address', 'mailing address', 'postal address', 'street address']
];

/**
 * Common filler/instructional prefixes often present in Google Forms questions
 */
const FILLER_PREFIXES = [
  /^enter your\s+/,
  /^please enter your\s+/,
  /^please enter\s+/,
  /^please provide your\s+/,
  /^please provide\s+/,
  /^provide your\s+/,
  /^what is your\s+/,
  /^what s your\s+/,
  /^your\s+/,
  /^enter\s+/,
  /^provide\s+/
];

/**
 * Strips instructional filler prefixes from normalized text
 */
function stripFillerPhrases(normText) {
  if (!normText) return '';
  let result = normText;
  for (const prefix of FILLER_PREFIXES) {
    if (prefix.test(result)) {
      result = result.replace(prefix, '').trim();
      break;
    }
  }
  return result;
}

/**
 * Checks whether two normalized labels belong to the same alias cluster
 */
function areLabelsInSameAliasCluster(normA, normB) {
  if (!normA || !normB) return false;
  for (const cluster of COMMON_FIELD_ALIASES) {
    const hasA = cluster.includes(normA);
    const hasB = cluster.includes(normB);
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Canonicalizes a sequence of tokens using the universal token map
 */
function canonicalizeTokens(normText) {
  if (!normText) return [];
  const words = normText.split(' ').filter(Boolean);
  return words.map((w) => TOKEN_CANONICAL_MAP[w] || w);
}

/**
 * Evaluates semantic and lexical similarity between a form question label
 * and a saved vault attribute label. Returns confidence score 0 - 100.
 *
 * @param {string} questionLabel - Extracted label from Google Forms
 * @param {string} attrLabel - User-visible label of vault attribute
 * @returns {number} Confidence score (0 to 100)
 */
export function scoreLabelMatch(questionLabel, attrLabel) {
  const normQ = normalizeLabel(questionLabel);
  const normAttr = normalizeLabel(attrLabel);

  if (!normQ || !normAttr) return 0;

  // 1. Exact normalized match (case-insensitive, punctuation & space collapsed)
  if (normQ === normAttr) {
    return 100;
  }

  // 2. Exact match after stripping conversational filler prefixes
  const cleanQ = stripFillerPhrases(normQ);
  const cleanAttr = stripFillerPhrases(normAttr);

  if (cleanQ === cleanAttr) {
    return 99;
  }

  // 3. Common equivalent alias clusters (e.g. Email <-> Email Address, Full Name <-> Name)
  if (areLabelsInSameAliasCluster(normQ, normAttr) || areLabelsInSameAliasCluster(cleanQ, cleanAttr)) {
    return 96;
  }

  // 4. General canonical token match (e.g. Hall Ticket No <-> Hall Ticket Number, Driver License No <-> Driver License Number)
  const tokensQ = canonicalizeTokens(cleanQ);
  const tokensAttr = canonicalizeTokens(cleanAttr);
  const canonQ = tokensQ.join(' ');
  const canonAttr = tokensAttr.join(' ');

  // Disambiguate personal name queries from institution/organization names
  const ORG_WORDS = ['college', 'university', 'institution', 'institute', 'school', 'company', 'organization', 'employer', 'bank', 'firm'];
  if (canonQ === 'name' && tokensAttr.some((t) => ORG_WORDS.includes(t))) {
    return 0;
  }
  if (canonAttr === 'name' && tokensQ.some((t) => ORG_WORDS.includes(t))) {
    return 0;
  }

  if (canonQ === canonAttr) {
    return 95;
  }

  // 5. Generic descriptor suffix stripping (e.g. "email" vs "email address", "passport" vs "passport number")
  const DESCRIPTOR_SUFFIXES = ['number', 'no', 'id', 'code', 'date', 'name', 'address', 'details'];
  const stripSuffix = (tokens) => {
    if (tokens.length > 1 && DESCRIPTOR_SUFFIXES.includes(tokens[tokens.length - 1])) {
      return tokens.slice(0, -1);
    }
    return tokens;
  };
  const baseQ = stripSuffix(tokensQ).join(' ');
  const baseAttr = stripSuffix(tokensAttr).join(' ');

  if (baseQ.length > 0 && baseQ === baseAttr) {
    return 92;
  }

  // 6. Token set containment (whole token subset match)
  // Check if all tokens of one label are contained in the other
  const setQ = new Set(tokensQ);
  const setAttr = new Set(tokensAttr);

  const qSubsetOfAttr = tokensQ.length > 0 && tokensQ.every((t) => setAttr.has(t));
  const attrSubsetOfQ = tokensAttr.length > 0 && tokensAttr.every((t) => setQ.has(t));

  if (qSubsetOfAttr || attrSubsetOfQ) {
    const overlapCount = tokensQ.filter((t) => setAttr.has(t)).length;
    const totalTokens = Math.max(tokensQ.length, tokensAttr.length);
    const ratio = overlapCount / totalTokens;
    if (ratio >= 0.5) {
      return Math.round(80 + ratio * 10); // 85 - 90
    }
  }

  // Below reliable confidence threshold
  return 0;
}

/**
 * Finds the semantic concept for a given form field
 */
export function detectFieldConcept(field) {
  const { id = '', name = '', placeholder = '', label = '', ariaLabel = '', autocomplete = '', type = '' } = field;

  const rawTokens = [id, name, placeholder, label, ariaLabel].join(' ').toLowerCase();
  const cleanTokens = normalizeSearchText(rawTokens);
  const normAc = (autocomplete || '').toLowerCase().trim();
  const normType = (type || '').toLowerCase().trim();

  let bestMatch = null;
  let highestScore = 0;

  for (const [conceptKey, config] of Object.entries(SEMANTIC_CATEGORIES)) {
    let score = 0;

    // 1. Direct autocomplete match (very high priority in web forms)
    if (normAc && config.autocompletes.includes(normAc)) {
      score = Math.max(score, 99);
    }

    // 2. Exact HTML input type match (e.g. type="email", type="tel")
    if (config.types && config.types.includes(normType)) {
      score = Math.max(score, 92);
    }

    // 3. Exact regex boundary match
    if (config.regex && config.regex.test(rawTokens)) {
      score = Math.max(score, 88);
    }

    // 4. Exact alias match against normalized name or id
    const normId = normalizeKey(id);
    const normName = normalizeKey(name);
    for (const alias of config.aliases) {
      if (normId === alias || normName === alias) {
        score = Math.max(score, 94);
        break;
      }
      if (normId.includes(alias) || normName.includes(alias)) {
        score = Math.max(score, 82);
      }
    }

    // 5. Keyword in label or placeholder
    const normLabel = normalizeSearchText(label);
    const normPlaceholder = normalizeSearchText(placeholder);
    for (const alias of config.aliases) {
      const aliasWords = alias.replace(/_/g, ' ');
      const wordRegex = new RegExp(`\\b${aliasWords}\\b`, 'i');
      if (wordRegex.test(normLabel) || wordRegex.test(normPlaceholder)) {
        score = Math.max(score, 85);
        break;
      }
    }

    // Disambiguate full name vs first name / last name or organization / institution names
    if (conceptKey === 'fullName') {
      if (/\b(first|last|given|family|surname)\b/i.test(rawTokens)) {
        score = 0;
      }
      if (/\b(college|university|institution|institute|school|company|organization|employer|business|firm|bank)\b/i.test(rawTokens)) {
        score = 0;
      }
    }

    if (score > highestScore && score >= 70) {
      highestScore = score;
      bestMatch = {
        conceptKey,
        canonical: config.canonical,
        confidence: score
      };
    }
  }

  return bestMatch;
}

/**
 * Intelligent decomposition:
 * Splits full names into first and last name components
 */
export function decomposeName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { first: '', last: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  return { first, last };
}

/**
 * Splits standard US / International addresses into street, city, state, zip
 */
export function decomposeAddress(fullAddress) {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return { street: '', city: '', state: '', zip: '' };
  }

  const parts = fullAddress.split(',').map((p) => p.trim());
  let street = parts[0] || '';
  let city = parts[1] || '';
  let state = '';
  let zip = '';

  if (parts[2]) {
    const stateZipParts = parts[2].trim().split(/\s+/);
    if (stateZipParts.length >= 2) {
      state = stateZipParts[0];
      zip = stateZipParts.slice(1).join(' ');
    } else {
      state = parts[2];
    }
  }

  return { street, city, state, zip };
}

/**
 * Detects whether a field is sensitive (passwords, OTPs/2FA, payment/card information).
 * STRICT POLICY: Sensitive fields must NEVER be matched or autofilled.
 */
export function isSensitiveField(field) {
  if (!field) return false;

  // 1. Password input type
  const type = (field.type || '').toLowerCase();
  if (type === 'password') return true;

  // 2. Sensitive autocomplete attributes
  const autocomplete = (field.autocomplete || '').toLowerCase();
  const sensitiveAutocompletes = [
    'current-password',
    'new-password',
    'one-time-code',
    'cc-number',
    'cc-csc',
    'cc-exp',
    'cc-exp-month',
    'cc-exp-year',
    'cc-type',
    'transaction-amount',
    'transaction-currency'
  ];
  if (sensitiveAutocompletes.includes(autocomplete)) return true;

  // 3. Inspect label, placeholder, name, id, and aria-label
  const rawTokens = [
    field.label,
    field.placeholder,
    field.name,
    field.id,
    field.ariaLabel
  ].filter(Boolean).join(' ').toLowerCase();

  const combinedTokens = rawTokens.replace(/[-_]/g, ' ');

  // Password patterns
  if (/\b(password|passwd|pwd|retype\s*password|confirm\s*password)\b/i.test(combinedTokens) || /password|passwd/i.test(rawTokens)) {
    return true;
  }

  // OTP / 2FA / Verification code patterns
  if (/\b(otp|one\s*time\s*(pass(word)?|code|pin)?|2fa|mfa|two\s*factor|2\s*factor|verification\s*code|security\s*code|authenticator\s*code|passcode|pin)\b/i.test(combinedTokens) || /\b(otp|2fa|mfa)\b/i.test(combinedTokens)) {
    return true;
  }

  // Payment, Credit card, CVV patterns
  if (/\b(credit\s*card|debit\s*card|card\s*number|card\s*num|cc\s*num|cvv|cvc|card\s*security|card\s*code|card\s*exp|expiry\s*date|expiration\s*date|routing\s*number|bank\s*account)\b/i.test(combinedTokens) || /\b(cvv|cvc)\b/i.test(combinedTokens)) {
    return true;
  }

  return false;
}

/**
 * Maps a single detected form field to the best matching Vault attribute(s).
 *
 * Requirements:
 * - Completely case-insensitive & punctuation-normalized matching.
 * - Matches against all saved attributes in the selected profile using user-visible Field Label.
 * - Supports exact normalized matches & general equivalent wording for any user-created field.
 * - Flags ambiguous matches when multiple attributes match, enabling user choice.
 * - Reports no match (null) instead of guessing.
 * - Never matches sensitive fields.
 *
 * @param {Object} field - DOM field metadata { id, name, placeholder, label, ariaLabel, autocomplete, type, selector }
 * @param {Array} vaultAttributes - Array of { id, label, key, value, category, docName }
 * @returns {Object|null} Match result or null if no reliable match exists
 */
export function matchFieldToVault(field, vaultAttributes = []) {
  if (!field || !Array.isArray(vaultAttributes) || vaultAttributes.length === 0) {
    return null;
  }

  // Security Gate: NEVER match or autofill sensitive fields (passwords, OTPs, payment info)
  if (isSensitiveField(field)) {
    return null;
  }

  // Verify and extract clean question label
  const rawQuestionLabel = field.label || field.placeholder || field.name || field.id || '';
  const normalizedQuestion = normalizeLabel(rawQuestionLabel);

  if (!normalizedQuestion) {
    // Cannot safely match an unlabeled or unidentifiable question
    return null;
  }

  // Safe development diagnostic log (no secrets/passwords/tokens logged)
  console.log(`[AutoDox AI Matcher] Inspecting form field: "${rawQuestionLabel}" against ${vaultAttributes.length} vault attributes`);

  // Detect semantic concept of field for auxiliary assistance (autocomplete types, etc.)
  const detectedConcept = detectFieldConcept(field);

  // Evaluate every saved attribute in the selected vault profile using its actual Field Label
  const scoredMatches = [];

  for (const attr of vaultAttributes) {
    if (!attr || !attr.label || !attr.value) continue;

    const rawAttrLabel = attr.label;
    const normalizedAttrLabel = normalizeLabel(rawAttrLabel);
    if (!normalizedAttrLabel) continue;

    // Primary matching engine: evaluate form question label against vault attribute label
    let score = scoreLabelMatch(rawQuestionLabel, rawAttrLabel);

    // Auxiliary check 1: direct identifier match (e.g. name="email" or id="email" matching attr)
    if (score < 90 && (field.name || field.id)) {
      const fieldIdScore = scoreLabelMatch(field.id, rawAttrLabel);
      const fieldNameScore = scoreLabelMatch(field.name, rawAttrLabel);
      const maxIdentifierScore = Math.max(fieldIdScore, fieldNameScore);
      if (maxIdentifierScore >= 95) {
        score = Math.max(score, 90);
      }
    }

    // Auxiliary check 2: semantic category concept match
    if (score < 85 && detectedConcept) {
      const config = SEMANTIC_CATEGORIES[detectedConcept.conceptKey];
      if (config) {
        const matchesConcept =
          config.regex.test(normalizedAttrLabel) ||
          normalizeLabel(config.canonical) === normalizedAttrLabel ||
          config.aliases.some((alias) => normalizeLabel(alias) === normalizedAttrLabel);

        if (matchesConcept) {
          score = Math.max(score, Math.min(detectedConcept.confidence, 88));
        }
      }
    }

    if (score >= 75) {
      scoredMatches.push({
        attr,
        score,
        derivedValue: attr.value
      });
    }
  }

  // Intelligent Decomposition Fallbacks:
  // If no direct attribute matched, check if we need First/Last Name from a Full Name attribute
  if (scoredMatches.length === 0) {
    const fullNameAttr = vaultAttributes.find((a) => {
      const norm = normalizeLabel(a.label);
      return norm === 'full name' || norm === 'full legal name' || norm === 'name';
    });

    if (fullNameAttr && fullNameAttr.value) {
      const { first, last } = decomposeName(fullNameAttr.value);
      const normQ = normalizeLabel(rawQuestionLabel);

      if ((normQ === 'first name' || normQ === 'given name' || normQ === 'fname') && first) {
        scoredMatches.push({
          attr: fullNameAttr,
          score: 92,
          derivedValue: first
        });
      } else if ((normQ === 'last name' || normQ === 'surname' || normQ === 'lname' || normQ === 'family name') && last) {
        scoredMatches.push({
          attr: fullNameAttr,
          score: 92,
          derivedValue: last
        });
      }
    }
  }

  // If no reliable match exists, report no match instead of guessing
  if (scoredMatches.length === 0) {
    console.log(`[AutoDox AI Matcher] No reliable match found for question: "${rawQuestionLabel}"`);
    return null;
  }

  // Sort matched attributes by score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  const topMatch = scoredMatches[0];
  const topScore = topMatch.score;

  // Ambiguity Detection:
  // If multiple attributes have very close match scores, flag the match as ambiguous
  // and present candidate attributes for the user to choose.
  const candidates = scoredMatches.filter((m) => {
    if (m.score < 75) return false;
    // If there is an exact normalized match (100), only near-exact aliases (>= 95) compete
    if (topScore === 100) {
      return m.score >= 95;
    }
    // Otherwise, close candidates within 12 points are treated as ambiguous
    return topScore - m.score <= 12;
  });

  const isAmbiguous = candidates.length > 1;

  if (isAmbiguous) {
    console.log(
      `[AutoDox AI Matcher] Ambiguous match for "${rawQuestionLabel}": multiple candidates (${candidates
        .map((c) => c.attr.label)
        .join(', ')})`
    );
  } else {
    console.log(
      `[AutoDox AI Matcher] Field "${rawQuestionLabel}" reliably matched with "${topMatch.attr.label}" (confidence: ${topScore})`
    );
  }

  return {
    fieldId: field.id || '',
    fieldName: field.name || '',
    fieldSelector: field.selector || '',
    fieldLabel: rawQuestionLabel,
    fieldType: field.type || 'text',
    isAmbiguous,
    candidateAttributes: candidates.map((c) => ({
      id: c.attr.id || c.attr.label,
      label: c.attr.label,
      value: c.derivedValue || c.attr.value,
      category: c.attr.category || 'Personal',
      score: c.score
    })),
    vaultKey: topMatch.attr.key || topMatch.attr.label,
    vaultLabel: topMatch.attr.label,
    vaultValue: topMatch.attr.value,
    valueToFill: topMatch.derivedValue || topMatch.attr.value,
    confidence: topScore,
    docName: topMatch.attr.docName || 'Vault'
  };
}

