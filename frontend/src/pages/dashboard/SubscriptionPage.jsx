import { useState } from 'react';
import {
  Check, Zap, MessageSquare, FileText, Users,
  Sparkles, ArrowRight, Mail,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

// ── Plan definitions ─────────────────────────────────────────

const PLANS = [
  {
    key:      'free',
    name:     'Free',
    price:    0,
    period:   'forever',
    chatLimit: 100,
    docLimit:  5,
    teamLimit: 1,
    features: [
      '100 chats / month',
      '5 knowledge documents',
      '1 team member',
      'Community support',
      'Basic analytics',
    ],
  },
  {
    key:      'starter',
    name:     'Starter',
    price:    29,
    period:   'mo',
    chatLimit: 1_000,
    docLimit:  25,
    teamLimit: 3,
    features: [
      '1,000 chats / month',
      '25 knowledge documents',
      '3 team members',
      'Email support',
      'Full analytics',
      'Conversation history',
    ],
  },
  {
    key:      'pro',
    name:     'Pro',
    popular:  true,
    price:    79,
    period:   'mo',
    chatLimit: 5_000,
    docLimit:  100,
    teamLimit: 10,
    features: [
      '5,000 chats / month',
      '100 knowledge documents',
      '10 team members',
      'Priority support',
      'Full analytics + export',
      'Custom widget colour',
      'API access',
    ],
  },
  {
    key:      'enterprise',
    name:     'Enterprise',
    price:    null,
    period:   null,
    chatLimit: Infinity,
    docLimit:  Infinity,
    teamLimit: Infinity,
    features: [
      'Unlimited chats',
      'Unlimited documents',
      'Unlimited team members',
      'Dedicated SLA support',
      'SSO / SAML',
      'Custom integrations',
      'On-premise option',
    ],
  },
];

// ── Page ─────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const { isLoading, plan, chatUsed, documentCount } = useSubscription();
  const [notice, setNotice] = useState('');

  const currentPlan = PLANS.find((p) => p.key === plan) ?? PLANS[0];

  const handleUpgrade = (targetPlan) => {
    if (targetPlan.key === 'enterprise') {
      setNotice('Our team will reach out within 24 hours to discuss an Enterprise plan for your needs.');
    } else {
      setNotice(`Billing integration coming soon. To upgrade to ${targetPlan.name}, contact us at billing@helpgenie.io.`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your plan and review your usage.
        </p>
      </div>

      <Alert
        type="info"
        message={notice}
        onDismiss={() => setNotice('')}
      />

      {/* ── Current plan banner ────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 shadow-sm shadow-brand-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Current plan
              </p>
              <h3 className="text-xl font-bold text-gray-900">
                {currentPlan.name}
                {currentPlan.price === 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">— Free forever</span>
                )}
                {currentPlan.price > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    — ${currentPlan.price}/{currentPlan.period}
                  </span>
                )}
              </h3>
            </div>
          </div>

          {plan !== 'enterprise' && (
            <Button
              onClick={() => {
                const next = PLANS[PLANS.findIndex((p) => p.key === plan) + 1];
                if (next) handleUpgrade(next);
              }}
              className="shrink-0 gap-2"
            >
              <Zap className="h-4 w-4" />
              Upgrade plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Usage meters */}
        <div className="grid gap-4 border-t border-gray-100 p-6 sm:grid-cols-3">
          <UsageMeter
            label="Chats this month"
            icon={MessageSquare}
            used={chatUsed}
            limit={currentPlan.chatLimit}
            loading={isLoading}
          />
          <UsageMeter
            label="Documents"
            icon={FileText}
            used={documentCount}
            limit={currentPlan.docLimit}
            loading={isLoading}
          />
          <UsageMeter
            label="Team members"
            icon={Users}
            used={1}
            limit={currentPlan.teamLimit}
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── Plan comparison ────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">All plans</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              isCurrent={p.key === plan}
              onUpgrade={() => handleUpgrade(p)}
            />
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <p>
          Need a custom plan or have billing questions?{' '}
          <a
            href="mailto:billing@helpgenie.io"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Contact us at billing@helpgenie.io
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Plan card ────────────────────────────────────────────────

function PlanCard({ plan, isCurrent, onUpgrade }) {
  return (
    <div
      className={cn(
        'card relative flex flex-col p-5 transition-shadow hover:shadow-md',
        isCurrent && 'border-brand-400 ring-1 ring-brand-400',
        plan.popular && !isCurrent && 'border-brand-200'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow">
            Most popular
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white shadow">
            Current
          </span>
        </div>
      )}

      {/* Name + price */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-500">{plan.name}</p>
        <div className="mt-1 flex items-baseline gap-1">
          {plan.price === null ? (
            <span className="text-2xl font-bold text-gray-900">Custom</span>
          ) : plan.price === 0 ? (
            <span className="text-2xl font-bold text-gray-900">Free</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-sm text-gray-400">/{plan.period}</span>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span className="text-gray-600">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-5">
        {isCurrent ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-400">
            <Check className="h-4 w-4" />
            Current plan
          </div>
        ) : plan.price === null ? (
          <Button
            variant="secondary"
            size="md"
            className="w-full gap-2"
            onClick={onUpgrade}
          >
            <Mail className="h-4 w-4" />
            Contact sales
          </Button>
        ) : (
          <Button
            size="md"
            className="w-full gap-2"
            onClick={onUpgrade}
          >
            <Zap className="h-4 w-4" />
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Usage meter ───────────────────────────────────────────────

function UsageMeter({ label, icon: Icon, used, limit, loading }) {
  const isUnlimited = limit === Infinity;
  const pct  = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const high = pct >= 80;
  const full = pct >= 100;

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="h-2 w-full rounded-full bg-gray-200" />
        <div className="h-3 w-16 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <Icon className="h-4 w-4 text-gray-400" />
          {label}
        </div>
        <span className="text-xs text-gray-400">
          {used.toLocaleString()}
          {' / '}
          {isUnlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        {!isUnlimited && (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              full ? 'bg-red-500' : high ? 'bg-amber-400' : 'bg-brand-500'
            )}
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && (
          <div className="h-full w-full rounded-full bg-brand-500 opacity-20" />
        )}
      </div>

      <p className="text-xs text-gray-400">
        {isUnlimited ? 'Unlimited' : full ? 'Limit reached' : high ? `${pct}% used — nearing limit` : `${pct}% used`}
      </p>
    </div>
  );
}
