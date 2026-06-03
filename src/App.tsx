import { useState } from 'react'
import './App.css'
import KaizenRanking from './components/kaizen/KaizenRanking'
import type { RankingCategory } from './services/kaizenRanking'

const rankingOptions = [
  { value: "sistemico", label: "Ranking sistemico" },
  { value: "operacional", label: "Ranking operacional" },
] satisfies Array<{ value: RankingCategory; label: string }>

function getRankingOption(value: RankingCategory) {
  return rankingOptions.find((option) => option.value === value) ?? rankingOptions[0]
}

function isRankingCategory(value: string): value is RankingCategory {
  return rankingOptions.some((option) => option.value === value)
}

const awards = [
  {
    cycle: "Trimestral",
    title: "Premiacao trimestral",
    prizes: [
      { position: "1o lugar", value: "R$ 150" },
      { position: "2o lugar", value: "R$ 100" },
    ],
  },
  {
    cycle: "Anual",
    title: "Premiacao anual",
    prizes: [
      { position: "1o lugar", value: "R$ 600" },
      { position: "2o lugar", value: "R$ 300" },
    ],
  },
]

function App() {
  const [selectedRanking, setSelectedRanking] = useState(rankingOptions[0])

  return (
    <main className="kaizen-page">
      <div className="kaizen-page__top-selector" aria-label="Seletor de ranking">
        <label className="kaizen-page__selector-label" htmlFor="ranking-selector">
          Ranking
        </label>
        <select
          className="kaizen-page__selector"
          id="ranking-selector"
          value={selectedRanking.value}
          onChange={(event) => {
            if (isRankingCategory(event.target.value)) {
              setSelectedRanking(getRankingOption(event.target.value))
            }
          }}
        >
          {rankingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <KaizenRanking
        selectedRankingCategory={selectedRanking.value}
        selectedRankingLabel={selectedRanking.label}
      />

      <section className="kaizen-awards" aria-labelledby="kaizen-awards-title">
        <div className="kaizen-awards__content">
          <div className="kaizen-awards__header">
            <span className="kaizen-awards__badge">Premiacoes</span>
            <h2 id="kaizen-awards-title" className="kaizen-awards__title">
              Vouchers por ciclo
            </h2>
            <p className="kaizen-awards__subtitle">
              Os participantes mais bem colocados no Ranking Atlas recebem vouchers conforme
              os fechamentos trimestrais e anuais.
            </p>
          </div>

          <div className="kaizen-awards__grid">
            {awards.map((award) => (
              <article className="kaizen-awards__card" key={award.cycle}>
                <div className="kaizen-awards__cycle">{award.cycle}</div>
                <h3 className="kaizen-awards__card-title">{award.title}</h3>
                <div className="kaizen-awards__prizes">
                  {award.prizes.map((prize) => (
                    <div className="kaizen-awards__prize" key={prize.position}>
                      <span>{prize.position}</span>
                      <strong>{prize.value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
