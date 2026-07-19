import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Copy, Check, Upload, Building2, Sliders, Code2 } from 'lucide-react';
import {
  useCompany, useUpdateCompany, useUploadLogo,
  useWidgetSettings, useUpdateWidgetSettings,
} from '@/hooks/useSettings';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'company', label: 'Company',  icon: Building2 },
  { key: 'widget',  label: 'Widget',   icon: Sliders   },
  { key: 'embed',   label: 'Embed',    icon: Code2     },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('company');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your company profile and widget configuration.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'company' && <CompanyTab />}
      {tab === 'widget'  && <WidgetTab />}
      {tab === 'embed'   && <EmbedTab />}
    </div>
  );
}

// ── Company tab ───────────────────────────────────────────────

function CompanyTab() {
  const { data: company, isLoading } = useCompany();
  const updateCompany = useUpdateCompany();
  const uploadLogo    = useUploadLogo();
  const logoInputRef  = useRef(null);

  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    if (company) reset({ name: company.name });
  }, [company, reset]);

  const onSubmit = async (values) => {
    setError('');
    try {
      await updateCompany.mutateAsync(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
    } catch (err) {
      setError(err.message || 'Logo upload failed.');
    }
    e.target.value = '';
  };

  if (isLoading) return <FormSkeleton rows={2} />;

  return (
    <div className="card p-6 space-y-6">
      <Alert type="error" message={error} onDismiss={() => setError('')} />

      {/* Logo */}
      <div className="flex items-center gap-5">
        <div
          onClick={() => logoInputRef.current?.click()}
          className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50 transition-colors"
        >
          {company?.logo ? (
            <img
              src={company.logo}
              alt="Company logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <Building2 className="h-8 w-8 text-gray-300" />
          )}
          {uploadLogo.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Company logo</p>
          <p className="mt-0.5 text-xs text-gray-400">
            PNG, JPG or SVG · Max 2 MB
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 gap-1.5"
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {company?.logo ? 'Change logo' : 'Upload logo'}
          </Button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      {/* Company name */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          label="Company name"
          placeholder="Acme Corp"
          error={errors.name?.message}
          {...register('name', { required: 'Company name is required' })}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            size="md"
            isLoading={updateCompany.isPending}
            disabled={!isDirty}
          >
            Save changes
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved!
            </span>
          )}
        </div>
      </form>

      {/* Read-only info */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
        <InfoRow label="Widget ID"   value={company?.widgetId ?? '—'} mono />
        <InfoRow label="Plan"        value={company?.plan ? capitalize(company.plan) : '—'} />
      </div>
    </div>
  );
}

// ── Widget settings tab ───────────────────────────────────────

function WidgetTab() {
  const { data: settings, isLoading } = useWidgetSettings();
  const updateSettings = useUpdateWidgetSettings();

  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } =
    useForm({
      defaultValues: {
        welcomeMessage: '',
        placeholder: '',
        themeColor: '#0ea5e9',
        position: 'bottom-right',
        allowedOrigins: '',
      },
    });

  const position    = watch('position');
  const themeColor  = watch('themeColor');

  useEffect(() => {
    if (settings?.widgetSettings) {
      const ws = settings.widgetSettings;
      reset({
        welcomeMessage: ws.welcomeMessage ?? '',
        placeholder:    ws.placeholder ?? '',
        themeColor:     ws.themeColor ?? '#0ea5e9',
        position:       ws.position ?? 'bottom-right',
        allowedOrigins: (ws.allowedOrigins ?? []).join('\n'),
      });
    }
  }, [settings, reset]);

  const onSubmit = async (values) => {
    setError('');
    try {
      await updateSettings.mutateAsync({
        ...values,
        allowedOrigins: values.allowedOrigins
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    }
  };

  if (isLoading) return <FormSkeleton rows={5} />;

  return (
    <div className="card p-6">
      <Alert type="error" message={error} onDismiss={() => setError('')} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
        <Input
          id="welcomeMessage"
          label="Welcome message"
          placeholder="Hi! How can I help you today?"
          helpText="First message visitors see when they open the widget."
          error={errors.welcomeMessage?.message}
          {...register('welcomeMessage', { maxLength: { value: 300, message: 'Max 300 characters' } })}
        />

        <Input
          id="placeholder"
          label="Input placeholder"
          placeholder="Ask me anything…"
          helpText="Hint text shown inside the message input."
          error={errors.placeholder?.message}
          {...register('placeholder', { maxLength: { value: 100, message: 'Max 100 characters' } })}
        />

        {/* Theme color */}
        <div className="space-y-1">
          <label className="label">Theme colour</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setValue('themeColor', e.target.value, { shouldDirty: true })}
              className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 p-0.5"
            />
            <code className="text-sm font-mono text-gray-700">{themeColor}</code>
          </div>
        </div>

        {/* Position toggle */}
        <div className="space-y-1">
          <label className="label">Widget position</label>
          <div className="flex gap-3">
            {['bottom-left', 'bottom-right'].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setValue('position', pos, { shouldDirty: true })}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                  position === pos
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                <PositionIcon side={pos} active={position === pos} />
                {pos === 'bottom-left' ? 'Bottom left' : 'Bottom right'}
              </button>
            ))}
          </div>
        </div>

        {/* Allowed origins */}
        <div className="space-y-1">
          <label htmlFor="allowedOrigins" className="label">
            Allowed origins
          </label>
          <textarea
            id="allowedOrigins"
            rows={3}
            placeholder={'https://mysite.com\nhttps://app.mysite.com'}
            className="input-base font-mono text-xs resize-none"
            {...register('allowedOrigins')}
          />
          <p className="text-xs text-gray-400">
            One origin per line. Leave empty to allow all origins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            size="md"
            isLoading={updateSettings.isPending}
            disabled={!isDirty}
          >
            Save settings
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Embed tab ─────────────────────────────────────────────────

function EmbedTab() {
  const { data: company } = useCompany();
  const [copied, setCopied] = useState(false);

  const snippet = company?.widgetId
    ? `<script\n  src="https://cdn.helpgenie.io/widget.js"\n  data-widget-id="${company.widgetId}"\n  async\n></script>`
    : '<!-- Widget ID not available yet —>';

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Install the widget</h3>
        <p className="mt-1 text-sm text-gray-500">
          Paste this snippet just before the closing{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">&lt;/body&gt;</code>{' '}
          tag on every page where you want the chat to appear.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
          <span className="text-xs font-medium text-gray-400">HTML</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto px-5 py-4 text-sm text-gray-100 leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 space-y-2 text-sm text-brand-800">
        <p className="font-medium">What happens next:</p>
        <ol className="list-decimal list-inside space-y-1 text-brand-700">
          <li>The widget loads asynchronously — no impact on page speed.</li>
          <li>Upload documents from the <strong>Documents</strong> page to train it.</li>
          <li>Customise the look under the <strong>Widget</strong> tab above.</li>
          <li>Share the page URL with your team to test before going live.</li>
        </ol>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={cn('text-xs text-gray-700', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

function PositionIcon({ side, active }) {
  const isRight = side === 'bottom-right';
  return (
    <div className="relative flex h-5 w-7 items-end justify-end rounded border border-current opacity-60">
      <div
        className={cn(
          'absolute bottom-0.5 h-2 w-2 rounded-full',
          active ? 'bg-brand-500' : 'bg-gray-400',
          isRight ? 'right-0.5' : 'left-0.5'
        )}
      />
    </div>
  );
}

function FormSkeleton({ rows = 3 }) {
  return (
    <div className="card p-6 space-y-4 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="h-10 w-full rounded-lg bg-gray-200" />
        </div>
      ))}
      <div className="h-9 w-28 rounded-lg bg-gray-200" />
    </div>
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
