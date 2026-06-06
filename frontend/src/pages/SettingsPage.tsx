import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { LLMConfig } from "../types";

export default function SettingsPage() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [provider, setProvider] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [timeout, setTimeout_] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<LLMConfig>("/api/config/llm").then((c) => {
      setConfig(c);
      setProvider(c.provider || "none");
      setModel(c.model || "");
      setBaseUrl(c.base_url || "");
      setTimeout_(c.timeout || 60);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.post("/api/config/llm", {
        provider,
        api_key: apiKey,
        model,
        base_url: baseUrl,
        timeout,
      });
      setMessage("配置已保存");
      const c = await api.get<LLMConfig>("/api/config/llm");
      setConfig(c);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">设置</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">LLM 配置</h2>
          {config && (
            <div className="text-sm text-gray-500">
              当前状态: {config.is_available ? "可用" : "不可用"}
            </div>
          )}

          {message && (
            <div className={`p-3 rounded text-sm ${message.includes("已保存") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="none">不使用 LLM</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          {provider !== "none" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder={provider === "openai" ? "gpt-4o-mini" : "claude-sonnet-4-20250514"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="可选，留空使用默认"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">超时 (秒)</label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout_(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                  min={10}
                  max={300}
                />
              </div>
            </>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  );
}
