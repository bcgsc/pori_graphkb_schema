import { schema as schemaDefn } from '../src';
import { generateStatementSentence } from '../src/sentenceTemplates';

import examples from './testData/statementExamples.json';

describe('generateStatementSentence', () => {
    describe('prognostic', () => {
        test('variant predicts prognosis in disease', () => {
            const key = 'subject:null|conditions:Disease;PositionalVariant|relevance:unfavourable prognosis';
            const result = 'DNMT3A:p.R882 predicts unfavourable prognosis in acute myeloid leukemia [DOID:9119]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('multiple variants predict prognosis in disease', () => {
            const key = 'subject:Vocabulary|conditions:Disease;PositionalVariant;PositionalVariant;Vocabulary|relevance:favourable prognosis';
            const result = 'Co-occurrence of chr19:y.qcopyloss, and chr1:y.pcopyloss predicts favourable prognosis in anaplastic oligodendroglioma [C4326]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant predicts unfavourable prognosis in disease', () => {
            const key = 'subject:Disease|conditions:CategoryVariant;Disease|relevance:unfavourable prognosis';
            const result = 'AGGF1 protein overexpression predicts unfavourable prognosis in hepatocellular carcinoma [HCC]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is a prognostic indicator in disease', () => {
            const key = 'subject:Vocabulary|conditions:Disease;PositionalVariant;Vocabulary|relevance:prognostic indicator';
            const result = 'KRAS:p.K117N is a prognostic indicator in colorectal cancer [DOID:9256]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });
    });

    describe('therapeutic', () => {
        test('variant is associated with response to therapy', () => {
            const key = 'subject:Therapy|conditions:PositionalVariant;Therapy|relevance:sensitivity';
            const result = 'NM_005228:p.L858R is associated with sensitivity to anti egfr tki';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is associated with increased toxicity to therapy', () => {
            const key = 'subject:Therapy|conditions:PositionalVariant;Therapy|relevance:increased toxicity';
            const result = 'DPYD:c.1905+1splice-donor mutation is associated with increased toxicity to fluoropyrimidine [C94728]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is associated with no response to therapy', () => {
            const key = 'subject:Therapy|conditions:Disease;PositionalVariant;Therapy|relevance:no response';
            const result = '(ENST00000260795,TACC3):fusion(e.16,e.4) is associated with no response to gefitinib [DB00317] in lung adenocarcinoma [DOID:3910]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('multiple variants result in sensitivity to therapy', () => {
            const key = 'subject:Therapy|conditions:Disease;PositionalVariant;PositionalVariant;Therapy|relevance:sensitivity';
            const result = 'Co-occurrence of KIT:p.V560D, and KIT:p.D820G is associated with sensitivity to imatinib [DB00619] in gastrointestinal stromal tumor [C3868]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });
    });

    describe('functional effects', () => {
        test('co-occuring variants result in tumourigenesis', () => {
            const result = 'Co-occurrence of PARK2 copy loss, and APC mutation contributes to tumourigenesis of colorectal cancer';
            const input = {
                conditions: [
                    {
                        displayName: 'PARK2 copy loss',
                        '@class': 'CategoryVariant',
                        '@rid': '#160:1133',
                    },
                    {
                        displayName: 'APC mutation',
                        '@class': 'CategoryVariant',
                        '@rid': '#160:1433',
                    },
                    {
                        displayName: 'colorectal cancer',
                        '@class': 'Disease',
                        '@rid': '#135:9855',
                    },
                ],
                subject: {
                    displayName: 'colorectal cancer',
                    '@class': 'Disease',
                    '@rid': '#135:9855',
                },
                relevance: {
                    name: 'tumourigenesis',
                    displayName: 'tumourigenesis',
                    '@class': 'Vocabulary',
                    '@rid': '#148:2',
                },
            };
            const { content } = generateStatementSentence(schemaDefn, input);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant results in increased expression', () => {
            const result = 'GATA3:p.P409fs results in increased expression of GATA3 in breast cancer';
            const input = {
                conditions: [
                    {
                        displayName: 'GATA3:p.P409fs',
                        '@class': 'PositionalVariant',
                        '@rid': '#160:1133',
                    },
                    {
                        displayName: 'breast cancer',
                        '@class': 'Disease',
                        '@rid': '#135:9855',
                    },
                    {
                        displayName: 'GATA3',
                        '@class': 'Feature',
                        '@rid': '#135:0',
                    },
                ],
                subject: {
                    displayName: 'GATA3',
                    '@class': 'Feature',
                    '@rid': '#135:0',
                },
                relevance: {
                    name: 'increased expression',
                    displayName: 'increased expression',
                    '@class': 'Vocabulary',
                    '@rid': '#148:2',
                },
            };
            const { content } = generateStatementSentence(schemaDefn, input);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is oncogenic', () => {
            const key = 'subject:PositionalVariant|conditions:PositionalVariant|relevance:oncogenic';
            const result = 'ALK:p.V1180L is oncogenic';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is tumour suppressive', () => {
            const key = 'subject:PositionalVariant|conditions:Disease;PositionalVariant|relevance:tumour suppressive';
            const result = 'PALB2:p.N1039fs is tumour suppressive in breast cancer [DOID:1612]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is an oncogenic fusion', () => {
            const key = 'subject:PositionalVariant|conditions:Disease;PositionalVariant|relevance:oncogenic fusion';
            const result = '(BCR,ABL1):fusion(e.13,e.3) is an oncogenic fusion in acute lymphocytic leukemia [DOID:9952]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is a disruptive fusion', () => {
            const key = 'subject:PositionalVariant|conditions:Disease;PositionalVariant|relevance:disruptive fusion';
            const result = '(KMT2A,MLLT6):fusion(e.10,e.11) is a disruptive fusion in acute lymphocytic leukemia [DOID:9952]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('gene is oncogenic', () => {
            const key = 'subject:Feature|conditions:Feature|relevance:oncogenic';
            const result = 'CD28 is oncogenic';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('gene is oncogenic is disease', () => {
            const key = 'subject:Feature|conditions:Disease;Feature|relevance:likely oncogenic';
            const result = 'ZNF217 is likely oncogenic in breast cancer [DOID:1612]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('gene is tumour suppressive', () => {
            const key = 'subject:Feature|conditions:Feature|relevance:tumour suppressive';
            const result = 'AMER1 is tumour suppressive';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('gene is tumour suppressive in disease', () => {
            const key = 'subject:Feature|conditions:Disease;Feature|relevance:tumour suppressive';
            const result = 'LSAMP is tumour suppressive in osteosarcoma [DOID:3347]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant results in SOF', () => {
            const key = 'subject:Feature|conditions:Feature;PositionalVariant|relevance:switch of function';
            const result = 'SF3B1:p.E622Q results in switch of function of SF3B1';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant has no functional effect', () => {
            const key = 'subject:Feature|conditions:Feature;PositionalVariant|relevance:no functional effect';
            const result = 'CDKN2A:p.A100V results in no functional effect of CDKN2A';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant results in GoF', () => {
            const key = 'subject:Feature|conditions:Feature;PositionalVariant|relevance:likely gain of function';
            const result = 'ABL1:p.E355A results in likely gain of function of ABL1';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant results in increased function', () => {
            const key = 'subject:Feature|conditions:Feature;PositionalVariant|relevance:increased function';
            const result = 'BRAF:p.G464E results in increased function of BRAF';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant results in a conditional LoF', () => {
            const key = 'subject:Feature|conditions:Feature;PositionalVariant|relevance:conditional loss of function';
            const result = 'TP53:p.R282W results in conditional loss of function of TP53';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });
    });

    describe('pathogenic/diagnostic', () => {
        test('variant is predisposing to disease', () => {
            const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:predisposing';
            const result = 'RUNX1:p.A107P is predisposing to acute myeloid leukemia [DOID:9119]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is pathogenic in disease', () => {
            const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:pathogenic';
            const result = 'NRAS:p.Q61R is pathogenic in thyroid cancer [DOID:1781]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant opposes diagnosis of disease', () => {
            const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:opposes diagnosis';
            const result = 'PDGFRA:p.D842V opposes diagnosis of gastrointestinal stromal tumor [DOID:9253]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant favours diagnosis of disease', () => {
            const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:favours diagnosis';
            const result = 'DNMT3A:p.R882 favours diagnosis of acute myeloid leukemia [DOID:9119]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });

        test('variant is diagnostic indicator of disease', () => {
            const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:diagnostic indicator';
            const result = '(EWSR1,FLI1):fusion(e.7,e.6) is a diagnostic indicator of bone ewing\'s sarcoma [DOID:3368]';
            const { content } = generateStatementSentence(schemaDefn, examples[key]);
            expect(content.replace(' ({evidence})', '')).toEqual(result);
        });
    });

    test('variant is a mutation hotspot in disease', () => {
        const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:mutation hotspot';
        const result = 'FGFR3:p.K650X is a mutation hotspot in multiple myeloma [DOID:9538]';
        const { content } = generateStatementSentence(schemaDefn, examples[key]);
        expect(content.replace(' ({evidence})', '')).toEqual(result);
    });

    test('variant is reccurrent in disease', () => {
        const key = 'subject:Disease|conditions:Disease;PositionalVariant|relevance:recurrent';
        const result = 'NRAS:p.Q61H is recurrent in acute myeloid leukemia [DOID:9119]';
        const { content } = generateStatementSentence(schemaDefn, examples[key]);
        expect(content.replace(' ({evidence})', '')).toEqual(result);
    });

    test('patient with variant in diesase is eligible for trial', () => {
        const key = 'subject:ClinicalTrial|conditions:CategoryVariant;ClinicalTrial;Disease|relevance:eligibility';
        const result = 'Patients with CD274 increased rna expression in osteosarcoma [DOID:3347] are eligible for NCT02879162';
        const { content } = generateStatementSentence(schemaDefn, examples[key]);
        expect(content.replace(' ({evidence})', '')).toEqual(result);
    });

    test('patient with variant is eligible for trial', () => {
        const key = 'subject:ClinicalTrial|conditions:ClinicalTrial;PositionalVariant|relevance:eligibility';
        const result = 'Patients with ERBB2:p.L755S are eligible for NCT02155621';
        const { content } = generateStatementSentence(schemaDefn, examples[key]);
        expect(content.replace(' ({evidence})', '')).toEqual(result);
    });

    test('test partial content', () => {
        const statement = {
            displayName: 'displayName',
            '@class': 'Statement',
            '@rid': '22:0',
            displayNameTemplate: 'Given {conditions} {relevance} applies to {subject} ({evidence})',
            relevance: { displayName: 'Mood Swings' },
            conditions: [{ displayName: 'Low blood sugar', class: 'Disease' }],
            subject: { displayName: 'hungertitis' },
            evidence: [{ displayName: 'A reputable source' }],
        };

        const { content } = generateStatementSentence(schemaDefn, statement);
        const result = 'Given Low blood sugar Mood Swings applies to hungertitis (A reputable source)';
        expect(content.replace(' ({evidence})', '')).toEqual(result);
    });
});
