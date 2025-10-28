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
} as const;

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
        return `${multiVariant}${keys.variant} is ${keys.relevance} in ${keys.disease} (${keys.evidence})`;
    }
    if (
        subjectType === 'disease'
        && hasVariant
    ) {
        if (relevance === 'diagnostic indicator') {
            return `${multiVariant}${keys.variant} is ${vowel || 'a'} ${keys.relevance} of ${keys.subject} (${keys.evidence})`;
        }
        if (relevance.includes('diagnos')) {
            return `${multiVariant}${keys.variant} ${keys.relevance} of ${keys.subject} (${keys.evidence})`;
        }
        if (relevance.includes('predisposing')) {
            return `${multiVariant}${keys.variant} is ${keys.relevance} to ${keys.subject} (${keys.evidence})`;
        }
        if (relevance === 'mutation hotspot') {
            return `${keys.variant} is ${vowel || 'a'} ${keys.relevance} in ${keys.subject} (${keys.evidence})`;
        }
        if (relevance === 'tumourigenesis') {
            return `${multiVariant}${keys.variant} contributes to ${keys.relevance} of ${keys.subject} (${keys.evidence})`;
        }
        return `${multiVariant}${keys.variant} is ${keys.relevance} in ${keys.subject} (${keys.evidence})`;
    }

    if (subjectType === 'feature' || subjectType.endsWith('variant')) {
        const isFunctional = relevance.includes('function')
            || relevance.includes(' expression');

        if (isFunctional && hasVariant) {
            if (!hasDisease) {
                return `${keys.variant} results in ${keys.relevance} of ${keys.subject} (${keys.evidence})`;
            }
            return `${keys.variant} results in ${keys.relevance} of ${keys.subject} in ${keys.disease} (${keys.evidence})`;
        }
        let article = '';

        if (relevance.endsWith(' fusion')) {
            article = /^[aeiou].*/.exec(relevance)
                ? 'an '
                : 'a ';
        }

        if (!hasDisease) {
            return `${keys.subject} is ${article}${keys.relevance} (${keys.evidence})`;
        }
        return `${keys.subject} is ${article}${keys.relevance} in ${keys.disease} (${keys.evidence})`;
    }

    if (subjectType === 'therapy' && hasVariant) {
        if (hasDisease) {
            return `${multiVariant}${keys.variant} is associated with ${keys.relevance} to ${keys.subject} in ${keys.disease} (${keys.evidence})`;
        }
        return `${multiVariant}${keys.variant} is associated with ${keys.relevance} to ${keys.subject} (${keys.evidence})`;
    }

    if (!subjectType || record.subject.displayName.toLowerCase() === 'patient') {
        let template;

        if (relevance.endsWith('prognosis')) {
            template = `${multiVariant}${keys.variant} predicts ${keys.relevance}`;
        } else if (relevance.endsWith('indicator')) {
            template = `${multiVariant}${keys.variant} is ${vowel || 'a'} ${keys.relevance}`;
        }
        if (template) {
            if (hasDisease) {
                template += ` in ${keys.disease} (${keys.evidence})`;
            }
            return template;
        }
    }

    if (hasVariant && relevance === 'eligibility' && subjectType === 'clinicaltrial') {
        if (hasDisease) {
            return `Patients with ${multiVariant}${keys.variant} in ${keys.disease} are eligible for ${keys.subject} (${keys.evidence})`;
        }
        return `Patients with ${multiVariant}${keys.variant} are eligible for ${keys.subject} (${keys.evidence})`;
    }

    if (conditionTypes.length === 1) {
        return `${keys.subject} is ${keys.relevance} (${keys.evidence})`;
    }

    return DEFAULT_TEMPLATE;
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
    keys=TEMPLATE_KEYS,
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

    // add the evidence
    if (replacementsFound.includes(keys.evidence) && record.evidence && record.evidence.length) {
        const words = record.evidence.map((e) => previewFunc(e));
        highlighted.push(...words);
        substitutions[keys.evidence] = naturalListJoin(words);
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
    TEMPLATE_KEYS,
};
