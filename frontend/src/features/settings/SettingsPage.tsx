import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth, type Profile } from '../../contexts/AuthContext'
import { updateProfile, resizeImageToDataUrl } from './settings.api'
import './SettingsPage.css'

function initialsOf(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

// Só monta quando o perfil já chegou, então o form nasce preenchido.
function ProfileForm({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth()
  const [name, setName] = useState(profile.name)
  const [avatar, setAvatar] = useState<string | null>(profile.avatarUrl)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setSaved(false)
    try {
      setAvatar(await resizeImageToDataUrl(file, 256))
    } catch {
      setError('Não foi possível ler a imagem.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (name.trim().length < 2) return setError('Informe seu nome.')

    setSaving(true)
    try {
      await updateProfile({ name: name.trim(), avatarUrl: avatar ?? '' })
      refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-avatar-row">
        <div className="settings-avatar">
          {avatar ? (
            <img src={avatar} alt="" className="settings-avatar-img" />
          ) : (
            initialsOf(name || '?')
          )}
        </div>
        <div className="settings-avatar-actions">
          <label className="settings-upload">
            Trocar foto
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
          </label>
          {avatar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAvatar(null)
                setSaved(false)
              }}
            >
              Remover
            </Button>
          )}
          <p className="settings-upload-hint">
            A imagem é reduzida para 256px antes de salvar.
          </p>
        </div>
      </div>

      <Input
        label="Seu nome"
        name="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setSaved(false)
        }}
        placeholder="Ex.: Isabelle Furui"
      />

      {error && (
        <p className="ui-alert ui-alert--error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="ui-alert ui-alert--success" role="status">
          Perfil atualizado.
        </p>
      )}

      <div className="settings-actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

function SettingsPage() {
  const { profile } = useAuth()

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Seus dados de perfil.</p>
        </div>
      </div>

      <div className="ui-card settings-card">
        {profile ? (
          <ProfileForm profile={profile} />
        ) : (
          <div className="settings-loading">
            <span className="ui-spinner" />
            Carregando…
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
