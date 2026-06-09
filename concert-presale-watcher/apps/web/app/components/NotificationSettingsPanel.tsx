"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import type { NotificationSettingsResponse } from "../../lib/types";
import styles from "../dashboard/dashboard.module.css";

interface NotificationSettingsPanelProps {
  settings: NotificationSettingsResponse | null;
  busy: boolean;
  onSave: (input: {
    discordWebhook?: string | null;
    discordEnabled: boolean;
    email?: string | null;
    emailEnabled: boolean;
    phone?: string | null;
    smsEnabled: boolean;
  }) => Promise<void>;
  onTestDiscord: () => Promise<void>;
  onSendEmailConfirmation: () => Promise<void>;
  onSendSmsConfirmation: () => Promise<void>;
  onConfirmSms: (code: string) => Promise<void>;
}

type NotificationChannel = "discord" | "email" | "sms";

const getStatusText = (
  configured: boolean,
  enabled: boolean,
  confirmed?: boolean,
): string => {
  if (!configured) return "Not set";
  if (confirmed === false) return enabled ? "Needs confirmation" : "Saved, off";
  return enabled ? "On" : "Saved, off";
};

export default function NotificationSettingsPanel({
  settings,
  busy,
  onSave,
  onTestDiscord,
  onSendEmailConfirmation,
  onSendSmsConfirmation,
  onConfirmSms,
}: NotificationSettingsPanelProps) {
  const uid = useId();
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedChannel, setExpandedChannel] =
    useState<NotificationChannel | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setDiscordEnabled(settings.discordWebhook.enabled);
    setEmailEnabled(settings.email.enabled);
    setSmsEnabled(settings.phone.enabled);
  }, [settings]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        discordWebhook: discordWebhook.trim() || undefined,
        discordEnabled,
        email: email.trim() || undefined,
        emailEnabled,
        phone: phone.trim() || undefined,
        smsEnabled,
      });
      setDiscordWebhook("");
      setEmail("");
      setPhone("");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSms = async () => {
    await onConfirmSms(smsCode);
    setSmsCode("");
  };

  const toggleChannel = (channel: NotificationChannel) => {
    setExpandedChannel((current) => (current === channel ? null : channel));
  };

  const disabled = busy || saving;
  const discordStatus = getStatusText(
    Boolean(settings?.discordWebhook.configured),
    discordEnabled,
  );
  const emailStatus = getStatusText(
    Boolean(settings?.email.configured),
    emailEnabled,
    settings?.email.confirmed,
  );
  const smsStatus = getStatusText(
    Boolean(settings?.phone.configured),
    smsEnabled,
    settings?.phone.confirmed,
  );

  return (
    <form className={styles.notificationStack} onSubmit={handleSave}>
      <section className={styles.channelCard}>
        <button
          type="button"
          className={styles.channelHeader}
          aria-expanded={expandedChannel === "discord"}
          aria-controls={`${uid}-discord-panel`}
          onClick={() => toggleChannel("discord")}
        >
          <span>Discord</span>
          <span className={styles.channelMeta}>
            <span className={styles.pill}>{discordStatus}</span>
            <span className={styles.channelChevron} aria-hidden="true">
              {expandedChannel === "discord" ? "v" : ">"}
            </span>
          </span>
        </button>
        {expandedChannel === "discord" ? (
          <div id={`${uid}-discord-panel`} className={styles.channelBody}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(event) => setDiscordEnabled(event.target.checked)}
              />
              Send Discord alerts
            </label>
            <label htmlFor={`${uid}-discord`} className="srOnly">
              Discord webhook URL
            </label>
            <input
              id={`${uid}-discord`}
              type="url"
              value={discordWebhook}
              onChange={(event) => setDiscordWebhook(event.target.value)}
              placeholder={
                settings?.discordWebhook.masked ?? "Discord webhook URL"
              }
            />
            <div className={styles.actionRow}>
              <span className={styles.pill}>
                {getStatusText(
                  Boolean(settings?.discordWebhook.configured),
                  discordEnabled,
                )}
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onTestDiscord}
                disabled={disabled || !settings?.discordWebhook.configured}
              >
                Send Test
              </button>
              {settings?.discordWebhook.configured ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    onSave({
                      discordWebhook: null,
                      discordEnabled: false,
                      emailEnabled,
                      smsEnabled,
                    })
                  }
                  disabled={disabled}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.channelCard}>
        <button
          type="button"
          className={styles.channelHeader}
          aria-expanded={expandedChannel === "email"}
          aria-controls={`${uid}-email-panel`}
          onClick={() => toggleChannel("email")}
        >
          <span>Email</span>
          <span className={styles.channelMeta}>
            <span className={styles.pill}>{emailStatus}</span>
            <span className={styles.channelChevron} aria-hidden="true">
              {expandedChannel === "email" ? "v" : ">"}
            </span>
          </span>
        </button>
        {expandedChannel === "email" ? (
          <div id={`${uid}-email-panel`} className={styles.channelBody}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
              />
              Send email alerts
            </label>
            <label htmlFor={`${uid}-email`} className="srOnly">
              Email address
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={settings?.email.masked ?? "Email address"}
            />
            <div className={styles.actionRow}>
              <span className={styles.pill}>
                {getStatusText(
                  Boolean(settings?.email.configured),
                  emailEnabled,
                  settings?.email.confirmed,
                )}
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onSendEmailConfirmation}
                disabled={disabled || !settings?.email.configured}
              >
                Send Confirmation
              </button>
              {settings?.email.configured ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    onSave({
                      email: null,
                      emailEnabled: false,
                      discordEnabled,
                      smsEnabled,
                    })
                  }
                  disabled={disabled}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.channelCard}>
        <button
          type="button"
          className={styles.channelHeader}
          aria-expanded={expandedChannel === "sms"}
          aria-controls={`${uid}-sms-panel`}
          onClick={() => toggleChannel("sms")}
        >
          <span>SMS</span>
          <span className={styles.channelMeta}>
            <span className={styles.pill}>{smsStatus}</span>
            <span className={styles.channelChevron} aria-hidden="true">
              {expandedChannel === "sms" ? "v" : ">"}
            </span>
          </span>
        </button>
        {expandedChannel === "sms" ? (
          <div id={`${uid}-sms-panel`} className={styles.channelBody}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(event) => setSmsEnabled(event.target.checked)}
              />
              Send SMS alerts
            </label>
            <label htmlFor={`${uid}-phone`} className="srOnly">
              Phone number
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={
                settings?.phone.masked ?? "Phone number, like +14155552671"
              }
            />
            <div className={styles.actionRow}>
              <span className={styles.pill}>
                {getStatusText(
                  Boolean(settings?.phone.configured),
                  smsEnabled,
                  settings?.phone.confirmed,
                )}
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onSendSmsConfirmation}
                disabled={disabled || !settings?.phone.configured}
              >
                Send Code
              </button>
              {settings?.phone.configured ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() =>
                    onSave({
                      phone: null,
                      smsEnabled: false,
                      discordEnabled,
                      emailEnabled,
                    })
                  }
                  disabled={disabled}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className={styles.confirmRow}>
              <label htmlFor={`${uid}-sms-code`} className="srOnly">
                SMS confirmation code
              </label>
              <input
                id={`${uid}-sms-code`}
                value={smsCode}
                onChange={(event) => setSmsCode(event.target.value)}
                placeholder="SMS code"
                inputMode="numeric"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleConfirmSms}
                disabled={disabled || !smsCode.trim()}
              >
                Confirm SMS
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className={styles.notificationsSaveBar}>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={disabled}
        >
          {saving ? "Saving..." : "Save Alert Destinations"}
        </button>
      </div>
    </form>
  );
}
