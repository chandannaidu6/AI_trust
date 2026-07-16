import { useState, ReactNode, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageContainer } from '../components/layout/PageContainer';
import { OptionPicker } from '../components/ui/OptionPicker';
import { Button } from '../components/ui/Button';
import { useStudy } from '../state/StudyContext';
import { ParticipantProfile, SkillLevel, Role, ReviewFrequency, AIFamiliarity } from '../types';
import { generateId } from '../utils/helpers';

function Field({ label, description, required, children }: {
  label: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ParticipantInfoPage() {
  const navigate = useNavigate();
  const { setParticipant } = useStudy();

  const [skillLevel,       setSkillLevel]       = useState<SkillLevel | ''>('');
  const [yearsExperience,  setYearsExperience]  = useState('');
  const [role,             setRole]             = useState<Role | ''>('');
  const [reviewFrequency,  setReviewFrequency]  = useState<ReviewFrequency | ''>('');
  const [aiFamiliarity,    setAIFamiliarity]    = useState<AIFamiliarity | ''>('');

  const isValid =
    skillLevel !== '' &&
    yearsExperience !== '' &&
    role !== '' &&
    reviewFrequency !== '' &&
    aiFamiliarity !== '';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const profile: ParticipantProfile = {
      id:                 generateId(),
      skillLevel:         skillLevel as SkillLevel,
      yearsExperience,
      role:               role as Role,
      reviewFrequency:    reviewFrequency as ReviewFrequency,
      aiFamiliarity:      aiFamiliarity as AIFamiliarity,
    };
    setParticipant(profile);
    navigate('/categories');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header step={1} back="/" />
      <PageContainer narrow>
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Participant Background</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            These questions help calibrate the study results. All responses are anonymous.
            Fields marked <span className="text-red-500" aria-label="required">*</span> are required.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm px-6 sm:px-8 py-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            <Field label="Overall programming skill level" required>
              <OptionPicker<SkillLevel>
                value={skillLevel}
                onChange={setSkillLevel}
                options={[
                  { value: 'beginner',     label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced',     label: 'Advanced' },
                  { value: 'expert',       label: 'Expert' },
                ]}
              />
            </Field>

            <Field label="Years of programming experience in Python and Java" required>
              <OptionPicker<string>
                value={yearsExperience}
                onChange={setYearsExperience}
                options={[
                  { value: '< 1 year',   label: '< 1 year' },
                  { value: '1–2 years',  label: '1–2 years' },
                  { value: '3–5 years',  label: '3–5 years' },
                  { value: '6–10 years', label: '6–10 years' },
                  { value: '10+ years',  label: '10+ years' },
                ]}
              />
            </Field>

            <Field label="Current role" required>
              <OptionPicker<Role>
                value={role}
                onChange={setRole}
                options={[
                  { value: 'student',    label: 'Student' },
                  { value: 'junior',     label: 'Junior Dev' },
                  { value: 'mid',        label: 'Mid-level Dev' },
                  { value: 'senior',     label: 'Senior Dev' },
                  { value: 'staff',      label: 'Staff / Principal' },
                  { value: 'researcher', label: 'Researcher' },
                  { value: 'other',      label: 'Other' },
                ]}
              />
            </Field>

            <Field label="How often do you perform code reviews?" required>
              <OptionPicker<ReviewFrequency>
                value={reviewFrequency}
                onChange={setReviewFrequency}
                options={[
                  { value: 'never',   label: 'Never' },
                  { value: 'rarely',  label: 'Rarely' },
                  { value: 'monthly', label: 'A few times / month' },
                  { value: 'weekly',  label: 'A few times / week' },
                  { value: 'daily',   label: 'Daily' },
                ]}
              />
            </Field>

            <Field
              label="How often do you use AI coding assistants?"
              description="e.g. GitHub Copilot, ChatGPT, Claude, Cursor, Codeium"
              required
            >
              <OptionPicker<AIFamiliarity>
                value={aiFamiliarity}
                onChange={setAIFamiliarity}
                options={[
                  { value: 'never',      label: 'Never' },
                  { value: 'aware',      label: 'Rarely' },
                  { value: 'occasional', label: 'Occasionally' },
                  { value: 'regular',    label: 'Regularly' },
                  { value: 'heavy',      label: 'Daily' },
                ]}
              />
            </Field>

            <div className="pt-2">
              <Button type="submit" size="lg" disabled={!isValid}>
                Continue →
              </Button>
              {!isValid && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Please answer all required questions to continue.
                </p>
              )}
            </div>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}
