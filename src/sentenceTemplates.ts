/* eslint-disable no-template-curly-in-string */
import { naturalListJoin } from './util';
import { GraphRecordId } from './constants';
import { StatementRecord } from './types';

const TEMPLATE_KEYS = {
    disease: '{conditions:disease}',
    variant: '{conditions:variant}',
    conditions: '{conditions}',
    subject: '{subject}',
    evidence: '{evidence}',
    relevance: '{relevance}',
    evidenceLevel: '{evidenceLevel}',
    preclinicalWarning: '{preclinicalWarning}',
} as const;

const PRECLINICAL_EVIDENCE_LEVELS = [
    // List of preclinical EvidenceLevel displayName.
    // EvidenceLevel descriptions in:
    // https://github.com/bcgsc/pori_graphkb_loader/blob/develop/data/evidenceLevels.json
    'AMP Level D (Tier II)',
    'CGI Pre-clinical ',
    'CIViC D',
    'CIViC D1',
    'CIViC D2',
    'CIViC D3',
    'CIViC D4',
    'CIViC D5',
    'MOAlmanac Preclinical',
    'IPR-D',
    'PROFYLE T4',
    'PROFYLE T4A',
    'PROFYLE T4B',
];
const PRECLINICAL_WARNING = 'preclinical models';

const DEFAULT_TEMPLATE = `Given ${
    TEMPLATE_KEYS.conditions
}, ${
    TEMPLATE_KEYS.relevance
} applies to ${
    TEMPLATE_KEYS.subject
} (${
    TEMPLATE_KEYS.evidence
})`;

/**
 * Given a template string and a statement record,
 * return an updated string with added evidence info
 *
 * Added info are:
 * - preclinical warning
 * - evidences
 * - evidence levels
 *
 * @param {string} template string
 * @param {object} record statement record
 * @param {object} [keys=TEMPLATE_KEYS] template key-value pairs
 * @param {object} [preclinical=PRECLINICAL_EVIDENCE_LEVELS] preclinical evidence level displayNames
 *
 * @returns the updated template string
 */
const addEvidence = (
    template: string,
    record: StatementRecord,
    keys = TEMPLATE_KEYS,
    preclinical = PRECLINICAL_EVIDENCE_LEVELS,
) => {
    // remove preexisting evidence info, if any
    let updated = template.replace(' (${keys.evidenceLevel})', '');
    updated = template.replace(' (${keys.evidence})', '');
    updated = template.replace(' ${keys.preclinicalWarning}', '');

    // preclinical warning
    let isPreclinical = false;

    if (record.evidenceLevel) {
        for (const evidenceLevel of record.evidenceLevel) {
            // As soon as one evidence level qualifies
            if (preclinical.includes(evidenceLevel.displayName)) {
                isPreclinical = true;
            }
        }
    }
    if (isPreclinical) {
        updated += ` ${keys.preclinicalWarning}`;
    }

    // evidences
    updated += ` (${keys.evidence})`;

    // evidence levels
    if (record.evidenceLevel) {
        updated += ` (${keys.evidenceLevel})`;
    }

    return updated;
};

/**
 * Given a statement record, return the most likely best fit for the displayNameTemplate
 *
 * @param {object} record statement record
 * @param {object} [keys=TEMPLATE_KEYS] template key-value pairs
 */
const chooseDefaultTemplate = (record: StatementRecord, keys = TEMPLATE_KEYS) => {
    const conditionTypes = record.conditions.map((c) => c['@class'].toLowerCase());
    const multiVariant = conditionTypes.filter((t) => t.endsWith('variant')).length > 1
        ? 'Co-occurrence of '
        : '';
    const hasVariant = conditionTypes.some((t) => t.endsWith('variant'));
    const hasDisease = conditionTypes.includes('disease');
    const relevance = record.relevance.name || record.relevance.displayName;
    const subjectType = record.subject
        ? record.subject['@class'].toLowerCase()
        : '';

    const vowel = /^[aeiou].*/.exec(relevance)
        ? 'an'
        : '';

    if (hasDisease && hasVariant && relevance === 'recurrent') {
        return addEvidence(
            `${multiVariant}${keys.variant} is ${keys.relevance} in ${keys.disease}`,
            record,
        );
    }
    if (
        subjectType === 'disease'
        && hasVariant
    ) {
        if (relevance === 'diagnostic indicator') {
            return addEvidence(
                `${multiVariant}${keys.variant} is ${vowel || 'a'} ${keys.relevance} of ${keys.subject}`,
                record,
            );
        }
        if (relevance.includes('diagnos')) {
            return addEvidence(
                `${multiVariant}${keys.variant} ${keys.relevance} of ${keys.subject}`,
                record,
            );
        }
        if (relevance.includes('predisposing')) {
            return addEvidence(
                `${multiVariant}${keys.variant} is ${keys.relevance} to ${keys.subject}`,
                record,
            );
        }
        if (relevance === 'mutation hotspot') {
            return addEvidence(
                `${keys.variant} is ${vowel || 'a'} ${keys.relevance} in ${keys.subject}`,
                record,
            );
        }
        if (relevance === 'tumourigenesis') {
            return addEvidence(
                `${multiVariant}${keys.variant} contributes to ${keys.relevance} of ${keys.subject}`,
                record,
            );
        }
        return addEvidence(
            `${multiVariant}${keys.variant} is ${keys.relevance} in ${keys.subject}`,
            record,
        );
    }

    if (subjectType === 'feature' || subjectType.endsWith('variant')) {
        const isFunctional = relevance.includes('function')
            || relevance.includes(' expression');

        if (isFunctional && hasVariant) {
            if (!hasDisease) {
                return addEvidence(
                    `${keys.variant} results in ${keys.relevance} of ${keys.subject}`,
                    record,
                );
            }
            return addEvidence(
                `${keys.variant} results in ${keys.relevance} of ${keys.subject} in ${keys.disease}`,
                record,
            );
        }
        let article = '';

        if (relevance.endsWith(' fusion')) {
            article = /^[aeiou].*/.exec(relevance)
                ? 'an '
                : 'a ';
        }

        if (!hasDisease) {
            return addEvidence(
                `${keys.subject} is ${article}${keys.relevance}`,
                record,
            );
        }
        return addEvidence(
            `${keys.subject} is ${article}${keys.relevance} in ${keys.disease}`,
            record,
        );
    }

    if (subjectType === 'therapy' && hasVariant) {
        if (hasDisease) {
            return addEvidence(
                `${multiVariant}${keys.variant} is associated with ${keys.relevance} to ${keys.subject} in ${keys.disease}`,
                record,
            );
        }
        return addEvidence(
            `${multiVariant}${keys.variant} is associated with ${keys.relevance} to ${keys.subject}`,
            record,
        );
    }

    // prognostic statements
    if (!subjectType || record.subject.displayName.toLowerCase() === 'patient') {
        let template;

        if (relevance.endsWith('prognosis')) {
            template = `${multiVariant}${keys.variant} predicts ${keys.relevance}`;
        } else if (relevance.endsWith('indicator')) { // e.g. prognostic indicator
            template = `${multiVariant}${keys.variant} is ${vowel || 'a'} ${keys.relevance}`;
        }
        if (template) {
            if (hasDisease) {
                template += ` in ${keys.disease}`;
            }
            return addEvidence(
                template,
                record,
            );
        }
    }

    // eligibility to clinical trials statements
    if (hasVariant && relevance === 'eligibility' && subjectType === 'clinicaltrial') {
        if (hasDisease) {
            return addEvidence(
                `Patients with ${multiVariant}${keys.variant} in ${keys.disease} are eligible for ${keys.subject}`,
                record,
            );
        }
        return addEvidence(
            `Patients with ${multiVariant}${keys.variant} are eligible for ${keys.subject}`,
            record,
        );
    }

    // default for a single conditions class statement
    if (conditionTypes.length === 1) {
        return addEvidence(
            `${keys.subject} is ${keys.relevance}`,
            record,
        );
    }

    // default
    return addEvidence(
        DEFAULT_TEMPLATE,
        record,
    );
};

/**
 * builds the sentence representing the preview of a statement record
 *
 * @param {function} previewFunc the preview function
 * @param {object} record the statement record to build the sentence for
 * @param {object} [keys=TEMPLATE_KEYS] template key-value pairs
 */
const generateStatementSentence = (
    previewFunc: (arg0: Record<string, unknown>)=> string,
    record: StatementRecord,
    keys = TEMPLATE_KEYS,
) => {
    let template;

    try {
        template = record.displayNameTemplate || chooseDefaultTemplate(record);
    } catch (err) {
        template = DEFAULT_TEMPLATE;
    }
    // detect the condition substitutions that are present
    const replacementsFound: string[] = [];

    const conditionsUsed: GraphRecordId[] = [];
    const substitutions: Record<string, string> = {};
    const highlighted: string[] = [];
    const conditions = (record.conditions || []).map((rec) => ({ ...rec }));

    for (const key of Object.values(keys)) {
        if (template.includes(key)) {
            replacementsFound.push(key);
        }
    }

    // don't re-use the subject if it is placed elsewhere
    if (replacementsFound.includes(keys.subject) && record.subject) {
        conditionsUsed.push(record.subject['@rid']);
        substitutions[keys.subject] = previewFunc(record.subject);
        highlighted.push(substitutions[keys.subject]);
    }

    if (replacementsFound.includes(keys.variant)) {
        const variants = conditions.filter(
            (c) => c['@class'].toLowerCase().includes('variant')
            && !conditionsUsed.includes(c['@rid']),
        );

        for (const v of variants) {
            conditionsUsed.push(v['@rid']);
        }

        if (variants.length) {
            const words = variants.map((c) => previewFunc(c));
            highlighted.push(...words);
            substitutions[keys.variant] = naturalListJoin(words);
        }
    }

    if (replacementsFound.includes(keys.disease)) {
        const diseases = conditions.filter(
            (c) => c['@class'] === 'Disease'
            && !conditionsUsed.includes(c['@rid']),
        );

        for (const d of diseases) {
            conditionsUsed.push(d['@rid']);
        }

        if (diseases.length) {
            const words = diseases.map((c) => previewFunc(c));
            highlighted.push(...words);
            substitutions[keys.disease] = naturalListJoin(words);
        }
    }

    // anything other condition should use the default replacement
    if (replacementsFound.includes(keys.conditions)) {
        const rest = conditions.filter((c) => !conditionsUsed.includes(c['@rid']));

        if (rest.length) {
            const words = rest.map((c) => previewFunc(c));
            highlighted.push(...words);
            substitutions[keys.conditions] = naturalListJoin(words);
        }
    }

    // add the relevance
    if (replacementsFound.includes(keys.relevance) && record.relevance) {
        substitutions[keys.relevance] = previewFunc(record.relevance);
        highlighted.push(substitutions[keys.relevance]);
    }

    // add the preclinical warning
    if (replacementsFound.includes(keys.preclinicalWarning)) {
        substitutions[keys.preclinicalWarning] = PRECLINICAL_WARNING;
        highlighted.push(substitutions[keys.preclinicalWarning]);
    }

    // add the evidence
    if (replacementsFound.includes(keys.evidence) && record.evidence && record.evidence.length) {
        const words = record.evidence.map((e) => previewFunc(e));
        highlighted.push(...words);
        substitutions[keys.evidence] = naturalListJoin(words);
    }

    // add the evidence level
    if (
        replacementsFound.includes(keys.evidenceLevel)
        && record.evidenceLevel
        && record.evidenceLevel.length
    ) {
        const words = record.evidenceLevel.map((e) => previewFunc(e));
        highlighted.push(...words);
        substitutions[keys.evidenceLevel] = naturalListJoin(words);
    }

    let content = template;

    Object.keys(substitutions).forEach((key) => {
        content = content.replace(key, substitutions[key]);
    });

    return { content, highlighted };
};

export {
    generateStatementSentence,
    chooseDefaultTemplate,
    DEFAULT_TEMPLATE,
    PRECLINICAL_EVIDENCE_LEVELS,
    PRECLINICAL_WARNING,
    TEMPLATE_KEYS,
};
