import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, CircleHelp, HeartPulse, Search, Shield, Stethoscope, Wind, X } from 'lucide-react'

const categories = ['All', 'Breathlessness', 'Cough', 'Asthma/COPD', 'Pneumonia/TB', 'Home Care']

const faqItems = [
  {
    category: 'Breathlessness',
    question: 'What causes shortness of breath?',
    answer: 'Shortness of breath can come from asthma, COPD, pneumonia, chest infection, anemia, anxiety, heart disease, fluid in the lungs, or low oxygen. The pattern matters: sudden severe breathlessness is more concerning than mild breathlessness during a cold. Ask about fever, wheeze, chest pain, swelling of feet, recent travel, smoke exposure, and whether the person can speak full sentences.',
  },
  {
    category: 'Breathlessness',
    question: 'When is breathing trouble an emergency?',
    answer: 'Treat it as urgent if the person has blue lips, confusion, fainting, severe chest pain, very fast breathing, noisy breathing at rest, inability to speak normally, oxygen saturation below 92 percent, or symptoms that are rapidly worsening. Do not wait for home remedies in these situations. Arrange emergency transport and keep the person sitting upright while help is coming.',
  },
  {
    category: 'Cough',
    question: 'Why do I keep coughing for many days?',
    answer: 'A cough may continue after a viral infection, but it can also be caused by asthma, allergies, acid reflux, smoking, TB, pneumonia, or some blood pressure medicines. Cough lasting more than 2 to 3 weeks should be reviewed, especially if there is fever, night sweats, weight loss, blood in sputum, chest pain, or breathlessness.',
  },
  {
    category: 'Cough',
    question: 'What does blood in sputum mean?',
    answer: 'Blood in sputum can happen after forceful coughing, but it can also signal TB, pneumonia, bronchiectasis, lung injury, or other serious lung disease. Any repeated blood, more than a streak, or blood with fever, weight loss, chest pain, or breathlessness needs medical assessment as soon as possible.',
  },
  {
    category: 'Asthma/COPD',
    question: 'How do I know if wheezing is serious?',
    answer: 'Wheezing is a whistling sound from narrowed airways. It is more serious when it happens at rest, keeps returning, disturbs sleep, comes with chest tightness, or does not improve after a prescribed reliever inhaler. Children, older adults, and people with known asthma or COPD should be watched closely during wheezing episodes.',
  },
  {
    category: 'Asthma/COPD',
    question: 'Can asthma start in adults too?',
    answer: 'Yes. Adult-onset asthma can start after repeated allergies, pollution exposure, smoke exposure, respiratory infections, or workplace exposure to dust and chemicals. Symptoms often include repeated cough, wheeze, chest tightness, and breathlessness that varies over time. A clinician may confirm it with examination and breathing tests.',
  },
  {
    category: 'Asthma/COPD',
    question: 'What is the difference between asthma and COPD?',
    answer: 'Asthma often varies day to day, may start earlier in life, and is commonly linked with allergy. COPD is more common in older adults, smokers, or people exposed to biomass smoke, and symptoms are usually more persistent. Both can cause wheeze and breathlessness, so diagnosis should be made by a clinician.',
  },
  {
    category: 'Asthma/COPD',
    question: 'How should I use an inhaler properly?',
    answer: 'Shake the inhaler if instructed, breathe out fully, seal lips around the inhaler or spacer, press once as you start breathing in slowly, then hold your breath for about 10 seconds if possible. If using a steroid inhaler, rinse the mouth after use. A spacer improves delivery and is especially helpful for children and older adults.',
  },
  {
    category: 'Pneumonia/TB',
    question: 'What are common signs of pneumonia?',
    answer: 'Pneumonia may cause fever, cough with phlegm, chest pain that worsens with breathing, fast breathing, weakness, and low oxygen. Older adults may show confusion, sleepiness, poor appetite, or worsening of existing disease instead of a high fever. Pneumonia needs medical review because antibiotics or oxygen may be needed.',
  },
  {
    category: 'Pneumonia/TB',
    question: 'Can TB cause cough and breathing issues?',
    answer: 'Yes. Tuberculosis can cause cough lasting more than 2 weeks, fever, night sweats, weight loss, weakness, swollen neck glands, and sometimes blood in sputum. TB is treatable, but it needs proper testing and a full medicine course through a doctor or TB clinic.',
  },
  {
    category: 'Pneumonia/TB',
    question: 'What is the difference between TB and pneumonia?',
    answer: 'Pneumonia often causes a more sudden illness with fever, cough, chest pain, and fast breathing over days. TB usually develops more slowly over weeks with cough, fever, night sweats, weight loss, and fatigue. There is overlap, so tests such as sputum examination, chest X-ray, and clinical review may be required.',
  },
  {
    category: 'Home Care',
    question: 'When should I check oxygen saturation?',
    answer: 'Check oxygen saturation during chest infection, pneumonia, asthma flare, COVID-like illness, or ongoing breathlessness. Warm the finger, remove nail polish if possible, and wait for a stable reading. Repeated readings below 92 percent, or any low reading with severe symptoms, should be treated as urgent.',
  },
  {
    category: 'Home Care',
    question: 'What can I do at home for mild breathing symptoms?',
    answer: 'Rest, drink fluids, avoid smoke and dust, use prescribed medicines exactly as advised, and monitor fever, breathing rate, and oxygen if available. Steam is not a substitute for treatment and can burn children. Seek care if symptoms worsen, persist, or include any red flags.',
  },
  {
    category: 'Home Care',
    question: 'Can pollution and smoke worsen lung problems?',
    answer: 'Yes. Cigarette smoke, second-hand smoke, kitchen smoke, dust, crop burning, and city pollution can trigger cough, asthma flare, COPD symptoms, and repeated chest infections. Improve ventilation, avoid indoor smoke, use cleaner cooking options where possible, and wear a mask during dusty or smoky exposure.',
  },
  {
    category: 'Home Care',
    question: 'Which vaccines help protect the lungs?',
    answer: 'Flu vaccine and pneumococcal vaccine can reduce serious respiratory infections for people at higher risk, including older adults and people with asthma, COPD, diabetes, heart disease, or weak immunity. Vaccine needs vary by age and health condition, so follow local medical advice.',
  },
  {
    category: 'Cough',
    question: 'When does a child with cough need urgent care?',
    answer: 'Urgent care is needed if a child has fast breathing, chest indrawing, blue lips, poor feeding, unusual sleepiness, repeated vomiting, noisy breathing, dehydration, or fever in a very young infant. Children can worsen quickly, so do not wait if breathing looks labored.',
  },
  {
    category: 'Breathlessness',
    question: 'Can anxiety cause breathlessness?',
    answer: 'Anxiety can cause rapid breathing, chest tightness, tingling, and a feeling of not getting enough air. However, never assume anxiety first when symptoms are new, severe, or come with chest pain, fainting, wheezing, fever, or low oxygen. Rule out medical causes when in doubt.',
  },
  {
    category: 'Asthma/COPD',
    question: 'What should be tracked for an asthma patient?',
    answer: 'Track daytime symptoms, night waking, reliever inhaler use, activity limitation, trigger exposure, and any emergency visits. If available, peak flow readings can help identify worsening early. Frequent reliever use or night symptoms suggests control is poor and the treatment plan needs review.',
  },
]

const redFlags = [
  'Severe shortness of breath or inability to speak full sentences',
  'Blue lips, confusion, fainting, or extreme drowsiness',
  'Chest pain with breathing trouble',
  'Oxygen saturation repeatedly below 92 percent',
  'Coughing blood, severe dehydration, or worsening fever',
]

const quickTips = [
  'Avoid smoking, vaping, and second-hand smoke.',
  'Keep rooms ventilated and reduce dust exposure.',
  'Use masks in heavy pollution, smoke, or dusty work areas.',
  'Take vaccines on time when advised by a clinician.',
  'Keep prescribed inhalers accessible and check technique regularly.',
  'Document oxygen, fever, and breathing rate when symptoms flare.',
]

export default function RespiratoryFaqs() {
  const [activeFaqIndex, setActiveFaqIndex] = useState(null)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return faqItems
      .map((item, index) => ({ ...item, index }))
      .filter((item) => category === 'All' || item.category === category)
      .filter((item) => {
        if (!query) return true
        return `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(query)
      })
  }, [category, search])

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Breathing And Lung FAQs</h2>
          <p>Practical guidance for cough, wheezing, asthma, pneumonia, COPD, TB, oxygen checks, and urgent warning signs.</p>
        </div>
      </div>

      <div className="grid-3 animate-in" style={{ marginBottom: 20 }}>
        <div className="glass-card stat-card" style={{ padding: 18 }}>
          <div style={{ color: '#06b6d4' }}><Wind size={22} /></div>
          <div className="stat-value" style={{ fontSize: 22, color: '#06b6d4' }}>{faqItems.length}</div>
          <div className="stat-label">Questions</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: 18 }}>
          <div style={{ color: '#f59e0b' }}><AlertTriangle size={22} /></div>
          <div className="stat-value" style={{ fontSize: 22, color: '#f59e0b' }}>Red Flags</div>
          <div className="stat-label">Clear escalation cues</div>
        </div>
        <div className="glass-card stat-card" style={{ padding: 18 }}>
          <div style={{ color: '#10b981' }}><Shield size={22} /></div>
          <div className="stat-value" style={{ fontSize: 22, color: '#10b981' }}>Prevention</div>
          <div className="stat-label">Smoke avoidance, masks, vaccines</div>
        </div>
      </div>

      <div className="glass-card animate-in" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search cough, oxygen, TB, inhaler..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {categories.map((item) => (
              <button key={item} type="button" className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {filteredFaqs.length} of {faqItems.length} FAQs.</div>
      </div>

      <div className="glass-card animate-in" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartPulse size={18} color="#ef4444" /> Go To A Doctor Urgently If
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {redFlags.map((item) => (
            <div key={item} className="glass-card glow-red" style={{ padding: 16, borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-in" style={{ display: 'grid', gap: 14 }}>
        {filteredFaqs.map((item) => (
          <div key={item.question} className="glass-card">
            <button type="button" onClick={() => setActiveFaqIndex(item.index)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'inherit', padding: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CircleHelp size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{item.index + 1}. {item.question}</h3>
                  <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: 12, color: '#06b6d4', marginTop: 6 }}>{item.category}</div>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {item.answer.slice(0, 210)}{item.answer.length > 210 ? '...' : ''}
                </p>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="glass-card animate-in" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Stethoscope size={18} color="#10b981" /> Daily Lung Care Tips
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {quickTips.map((tip) => (
            <div key={tip} style={{ padding: 14, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.16)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</div>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Educational guidance only. It does not replace a qualified doctor, emergency service, or local clinical protocol.
        </p>
      </div>

      {activeFaqIndex !== null && (
        <div onClick={() => setActiveFaqIndex(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1200 }}>
          <div className="glass-card" onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 760, padding: 24, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#06b6d4', marginBottom: 8 }}>{faqItems[activeFaqIndex].category}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{activeFaqIndex + 1}. {faqItems[activeFaqIndex].question}</h3>
              </div>
              <button type="button" onClick={() => setActiveFaqIndex(null)} style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-secondary)', width: 34, height: 34, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close FAQ popup">
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-secondary)' }}>{faqItems[activeFaqIndex].answer}</p>
          </div>
        </div>
      )}
    </div>
  )
}
