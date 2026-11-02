import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'precificacao-3d:v1'

// Valores iniciais = os mesmos do script em Python
const DEFAULTS = {
  precoRolo: '60',
  pesoPeca: '150',
  tempoHoras: '2',
  consumoKw: '0.15',
  precoKwh: '1.18',
  taxaDesgasteHora: '2.00',
  custoEmbalagem: '3.00',
  maoDeObra: '5.00',
  margem: '2.5'
}

const FIELDS = {
  peca: [
    {
      key: 'pesoPeca',
      label: 'Peso da peça',
      unit: 'g',
      hint: 'Indicado no fatiador'
    },
    {
      key: 'tempoHoras',
      label: 'Tempo de impressão',
      unit: 'h',
      hint: 'Horas decimais (1.5 = 1h30)'
    }
  ],
  custos: [
    {
      key: 'precoRolo',
      label: 'Preço do rolo (1 kg)',
      unit: 'R$',
      hint: 'PETG'
    },
    {
      key: 'consumoKw',
      label: 'Consumo da impressora',
      unit: 'kW',
      hint: 'K1C ≈ 0,20'
    },
    { key: 'precoKwh', label: 'Preço do kWh', unit: 'R$', hint: '' },
    {
      key: 'taxaDesgasteHora',
      label: 'Desgaste por hora',
      unit: 'R$/h',
      hint: 'Fundo de reserva'
    },
    { key: 'custoEmbalagem', label: 'Embalagem', unit: 'R$', hint: 'Por peça' },
    { key: 'maoDeObra', label: 'Mão de obra', unit: 'R$', hint: 'Por peça' }
  ],
  margem: [
    {
      key: 'margem',
      label: 'Multiplicador de margem',
      unit: 'x',
      hint: '2.5x a 4x para decoração'
    }
  ]
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})
const pct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

// Aceita vírgula ou ponto como separador decimal
const num = v => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function loadValues() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { ...DEFAULTS, ...(saved || {}) }
  } catch {
    return DEFAULTS
  }
}

function Field({ field, value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">
        {field.label}
        {field.hint && <small>{field.hint}</small>}
      </span>
      <span className="input-wrap">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          onFocus={e => e.target.select()}
        />
        <span className="unit">{field.unit}</span>
      </span>
    </label>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function App() {
  const [values, setValues] = useState(loadValues)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
    } catch {
      /* armazenamento indisponível: ignora */
    }
  }, [values])

  const setField = (key, v) => setValues(prev => ({ ...prev, [key]: v }))
  const reset = () => setValues(DEFAULTS)

  const r = useMemo(() => {
    const v = Object.fromEntries(
      Object.entries(values).map(([k, x]) => [k, num(x)])
    )
    const material = (v.precoRolo / 1000) * v.pesoPeca
    const energia = v.consumoKw * v.tempoHoras * v.precoKwh
    const maquina = v.taxaDesgasteHora * v.tempoHoras
    const extras = v.custoEmbalagem + v.maoDeObra
    const custoTotal = material + energia + maquina + extras
    const precoVenda = custoTotal * v.margem
    const lucro = precoVenda - custoTotal
    const margemPct = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0
    return {
      material,
      energia,
      maquina,
      extras,
      custoTotal,
      precoVenda,
      lucro,
      margemPct
    }
  }, [values])

  return (
    <main className="app">
      <header>
        <h1>Precificação 3D</h1>
        <p>Calculadora de preço de venda · PETG</p>
      </header>

      <div className="layout">
        <div className="inputs">
          <section className="card">
            <h2>Peça atual</h2>
            {FIELDS.peca.map(f => (
              <Field
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={setField}
              />
            ))}
          </section>

          <section className="card">
            <h2>Custos</h2>
            {FIELDS.custos.map(f => (
              <Field
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={setField}
              />
            ))}
          </section>

          <section className="card">
            <h2>Margem</h2>
            {FIELDS.margem.map(f => (
              <Field
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={setField}
              />
            ))}
          </section>

          <button className="reset" type="button" onClick={reset}>
            Restaurar valores padrão
          </button>
        </div>

        <aside className="results">
          <section className="card highlight">
            <span className="big-label">Preço sugerido de venda</span>
            <span className="big-value">{brl.format(r.precoVenda)}</span>
            <span className="sub">
              Lucro líquido {brl.format(r.lucro)} · {pct.format(r.margemPct)}%
              do preço
            </span>
          </section>

          <section className="card">
            <h2>Resumo de custos</h2>
            <Row label="Material (PETG)" value={brl.format(r.material)} />
            <Row label="Energia" value={brl.format(r.energia)} />
            <Row label="Desgaste da máquina" value={brl.format(r.maquina)} />
            <Row label="Embalagem + mão de obra" value={brl.format(r.extras)} />
            <Row
              label="Custo total da peça"
              value={brl.format(r.custoTotal)}
              strong
            />
          </section>
        </aside>
      </div>
    </main>
  )
}
