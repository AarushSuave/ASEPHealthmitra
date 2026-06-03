import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, CircleHelp, HeartPulse, Search, Shield, Stethoscope, Wind, X } from 'lucide-react'

const categories = {
    en: ['All', 'Breathlessness', 'Cough', 'Asthma/COPD', 'Pneumonia/TB', 'Home Care'],
    hi: ['सभी', 'सांस फूलना', 'खांसी', 'अस्थमा/सीओपीडी', 'निमोनिया/टीबी', 'घरेलू देखभाल']
}

const faqItems = [
    {
        category: 'Breathlessness', categoryHi: 'सांस फूलना',
        question: 'What causes shortness of breath?', questionHi: 'सांस फूलने के क्या कारण हैं?',
        answer: 'Shortness of breath can come from asthma, COPD, pneumonia, chest infection, anemia, anxiety, heart disease, fluid in the lungs, or low oxygen. The pattern matters: sudden severe breathlessness is more concerning than mild breathlessness during a cold. Ask about fever, wheeze, chest pain, swelling of feet, recent travel, smoke exposure, and whether the person can speak full sentences.',
        answerHi: 'सांस फूलना अस्थमा, सीओपीडी, निमोनिया, सीने में संक्रमण, एनीमिया, चिंता, हृदय रोग, फेफड़ों में पानी या कम ऑक्सीजन से हो सकता है। अचानक गंभीर सांस फूलना हल्की सांस फूलने से अधिक चिंताजनक है। बुखार, घरघराहट, सीने में दर्द, पैरों में सूजन, हाल की यात्रा, धुएं के संपर्क आदि के बारे में पूछें।',
    },
    {
        category: 'Breathlessness', categoryHi: 'सांस फूलना',
        question: 'When is breathing trouble an emergency?', questionHi: 'सांस की तकलीफ कब आपातकाल होती है?',
        answer: 'Treat it as urgent if the person has blue lips, confusion, fainting, severe chest pain, very fast breathing, noisy breathing at rest, inability to speak normally, oxygen saturation below 92 percent, or symptoms that are rapidly worsening. Do not wait for home remedies in these situations. Arrange emergency transport and keep the person sitting upright while help is coming.',
        answerHi: 'यदि व्यक्ति के होंठ नीले हों, भ्रम हो, बेहोशी हो, सीने में गंभीर दर्द हो, बहुत तेज सांसें हों, सामान्य रूप से बोलने में असमर्थता हो, ऑक्सीजन 92% से कम हो तो इसे जरूरी मानें। इन स्थितियों में घरेलू उपचार का इंतजार न करें। आपातकालीन परिवहन की व्यवस्था करें।',
    },
    {
        category: 'Cough', categoryHi: 'खांसी',
        question: 'Why do I keep coughing for many days?', questionHi: 'मुझे कई दिनों से खांसी क्यों हो रही है?',
        answer: 'A cough may continue after a viral infection, but it can also be caused by asthma, allergies, acid reflux, smoking, TB, pneumonia, or some blood pressure medicines. Cough lasting more than 2 to 3 weeks should be reviewed, especially if there is fever, night sweats, weight loss, blood in sputum, chest pain, or breathlessness.',
        answerHi: 'वायरल संक्रमण के बाद भी खांसी जारी रह सकती है, लेकिन यह अस्थमा, एलर्जी, एसिड रिफ्लक्स, धूम्रपान, टीबी, निमोनिया या रक्तचाप की दवाओं के कारण भी हो सकती है। 2-3 सप्ताह से अधिक की खांसी की जांच होनी चाहिए।',
    },
    {
        category: 'Cough', categoryHi: 'खांसी',
        question: 'What does blood in sputum mean?', questionHi: 'बलगम में खून आने का क्या मतलब है?',
        answer: 'Blood in sputum can happen after forceful coughing, but it can also signal TB, pneumonia, bronchiectasis, lung injury, or other serious lung disease. Any repeated blood, more than a streak, or blood with fever, weight loss, chest pain, or breathlessness needs medical assessment as soon as possible.',
        answerHi: 'जोरदार खांसी के बाद बलगम में खून आ सकता है, लेकिन यह टीबी, निमोनिया, फेफड़ों की चोट या गंभीर बीमारी का संकेत भी हो सकता है। बार-बार खून आना, बुखार या वजन कम होने के साथ खून आने पर तुरंत चिकित्सा मूल्यांकन की आवश्यकता है।',
    },
    {
        category: 'Asthma/COPD', categoryHi: 'अस्थमा/सीओपीडी',
        question: 'How do I know if wheezing is serious?', questionHi: 'मुझे कैसे पता चलेगा कि घरघराहट गंभीर है?',
        answer: 'Wheezing is a whistling sound from narrowed airways. It is more serious when it happens at rest, keeps returning, disturbs sleep, comes with chest tightness, or does not improve after a prescribed reliever inhaler. Children, older adults, and people with known asthma or COPD should be watched closely during wheezing episodes.',
        answerHi: 'घरघराहट संकीर्ण वायुमार्ग से आने वाली सीटी जैसी आवाज है। यह अधिक गंभीर है जब यह आराम के समय हो, बार-बार हो, नींद में खलल डाले या इनहेलर के बाद भी सुधार न हो।',
    },
    {
        category: 'Asthma/COPD', categoryHi: 'अस्थमा/सीओपीडी',
        question: 'Can asthma start in adults too?', questionHi: 'क्या वयस्कों में भी अस्थमा शुरू हो सकता है?',
        answer: 'Yes. Adult-onset asthma can start after repeated allergies, pollution exposure, smoke exposure, respiratory infections, or workplace exposure to dust and chemicals. Symptoms often include repeated cough, wheeze, chest tightness, and breathlessness that varies over time. A clinician may confirm it with examination and breathing tests.',
        answerHi: 'हां। वयस्क-शुरुआत अस्थमा एलर्जी, प्रदूषण, धुएं, संक्रमण या धूल/रसायनों के संपर्क के बाद शुरू हो सकता है। लक्षणों में अक्सर बार-बार खांसी, घरघराहट और सांस फूलना शामिल होता है।',
    },
    {
        category: 'Asthma/COPD', categoryHi: 'अस्थमा/सीओपीडी',
        question: 'What is the difference between asthma and COPD?', questionHi: 'अस्थमा और सीओपीडी में क्या अंतर है?',
        answer: 'Asthma often varies day to day, may start earlier in life, and is commonly linked with allergy. COPD is more common in older adults, smokers, or people exposed to biomass smoke, and symptoms are usually more persistent. Both can cause wheeze and breathlessness, so diagnosis should be made by a clinician.',
        answerHi: 'अस्थमा अक्सर दिन-प्रतिदिन बदलता है और एलर्जी से जुड़ा होता है। सीओपीडी वृद्ध वयस्कों, धूम्रपान करने वालों या बायोमास धुएं के संपर्क में आने वालों में अधिक आम है। दोनों घरघराहट और सांस फूलने का कारण बन सकते हैं।',
    },
    {
        category: 'Asthma/COPD', categoryHi: 'अस्थमा/सीओपीडी',
        question: 'How should I use an inhaler properly?', questionHi: 'मुझे इनहेलर का सही उपयोग कैसे करना चाहिए?',
        answer: 'Shake the inhaler if instructed, breathe out fully, seal lips around the inhaler or spacer, press once as you start breathing in slowly, then hold your breath for about 10 seconds if possible. If using a steroid inhaler, rinse the mouth after use. A spacer improves delivery and is especially helpful for children and older adults.',
        answerHi: 'निर्देशानुसार इनहेलर को हिलाएं, पूरी तरह से सांस छोड़ें, इनहेलर के चारों ओर होंठों को सील करें, धीरे-धीरे सांस लेते हुए एक बार दबाएं, फिर 10 सेकंड तक सांस रोकें। स्टेरॉयड इनहेलर के बाद मुंह धो लें।',
    },
    {
        category: 'Pneumonia/TB', categoryHi: 'निमोनिया/टीबी',
        question: 'What are common signs of pneumonia?', questionHi: 'निमोनिया के सामान्य लक्षण क्या हैं?',
        answer: 'Pneumonia may cause fever, cough with phlegm, chest pain that worsens with breathing, fast breathing, weakness, and low oxygen. Older adults may show confusion, sleepiness, poor appetite, or worsening of existing disease instead of a high fever. Pneumonia needs medical review because antibiotics or oxygen may be needed.',
        answerHi: 'निमोनिया से बुखार, बलगम वाली खांसी, सीने में दर्द, तेज सांस, कमजोरी और कम ऑक्सीजन हो सकती है। वृद्ध लोगों में भ्रम या नींद आ सकती है। निमोनिया को चिकित्सा समीक्षा की आवश्यकता है।',
    },
    {
        category: 'Pneumonia/TB', categoryHi: 'निमोनिया/टीबी',
        question: 'Can TB cause cough and breathing issues?', questionHi: 'क्या टीबी खांसी और सांस की समस्या पैदा कर सकता है?',
        answer: 'Yes. Tuberculosis can cause cough lasting more than 2 weeks, fever, night sweats, weight loss, weakness, swollen neck glands, and sometimes blood in sputum. TB is treatable, but it needs proper testing and a full medicine course through a doctor or TB clinic.',
        answerHi: 'हां। टीबी से 2 सप्ताह से अधिक समय तक खांसी, बुखार, रात में पसीना, वजन कम होना, और कभी-कभी बलगम में खून आ सकता है। टीबी का इलाज संभव है, लेकिन इसके लिए उचित परीक्षण और दवा की आवश्यकता होती है।',
    },
    {
        category: 'Pneumonia/TB', categoryHi: 'निमोनिया/टीबी',
        question: 'What is the difference between TB and pneumonia?', questionHi: 'टीबी और निमोनिया में क्या अंतर है?',
        answer: 'Pneumonia often causes a more sudden illness with fever, cough, chest pain, and fast breathing over days. TB usually develops more slowly over weeks with cough, fever, night sweats, weight loss, and fatigue. There is overlap, so tests such as sputum examination, chest X-ray, and clinical review may be required.',
        answerHi: 'निमोनिया अक्सर दिनों में बुखार, खांसी और तेज सांस के साथ अचानक बीमारी का कारण बनता है। टीबी आमतौर पर हफ्तों में धीरे-धीरे विकसित होती है। परीक्षण आवश्यक हो सकते हैं।',
    },
    {
        category: 'Home Care', categoryHi: 'घरेलू देखभाल',
        question: 'When should I check oxygen saturation?', questionHi: 'मुझे ऑक्सीजन संतृप्ति (saturation) कब जांचनी चाहिए?',
        answer: 'Check oxygen saturation during chest infection, pneumonia, asthma flare, COVID-like illness, or ongoing breathlessness. Warm the finger, remove nail polish if possible, and wait for a stable reading. Repeated readings below 92 percent, or any low reading with severe symptoms, should be treated as urgent.',
        answerHi: 'सीने में संक्रमण, निमोनिया, अस्थमा भड़कने या सांस फूलने के दौरान ऑक्सीजन की जांच करें। 92 प्रतिशत से नीचे की रीडिंग को जरूरी मानें।',
    },
    {
        category: 'Home Care', categoryHi: 'घरेलू देखभाल',
        question: 'What can I do at home for mild breathing symptoms?', questionHi: 'हल्के सांस के लक्षणों के लिए मैं घर पर क्या कर सकता हूं?',
        answer: 'Rest, drink fluids, avoid smoke and dust, use prescribed medicines exactly as advised, and monitor fever, breathing rate, and oxygen if available. Steam is not a substitute for treatment and can burn children. Seek care if symptoms worsen, persist, or include any red flags.',
        answerHi: 'आराम करें, तरल पदार्थ पिएं, धुएं और धूल से बचें, निर्धारित दवाओं का उपयोग करें और बुखार/ऑक्सीजन की निगरानी करें। लक्षण बिगड़ने पर चिकित्सा लें।',
    },
    {
        category: 'Home Care', categoryHi: 'घरेलू देखभाल',
        question: 'Can pollution and smoke worsen lung problems?', questionHi: 'क्या प्रदूषण और धुआं फेफड़ों की समस्याओं को बढ़ा सकते हैं?',
        answer: 'Yes. Cigarette smoke, second-hand smoke, kitchen smoke, dust, crop burning, and city pollution can trigger cough, asthma flare, COPD symptoms, and repeated chest infections. Improve ventilation, avoid indoor smoke, use cleaner cooking options where possible, and wear a mask during dusty or smoky exposure.',
        answerHi: 'हां। सिगरेट का धुआं, रसोई का धुआं, धूल और प्रदूषण खांसी, अस्थमा और संक्रमण को ट्रिगर कर सकते हैं। वेंटिलेशन में सुधार करें और मास्क पहनें।',
    },
    {
        category: 'Home Care', categoryHi: 'घरेलू देखभाल',
        question: 'Which vaccines help protect the lungs?', questionHi: 'कौन से टीके फेफड़ों की रक्षा करने में मदद करते हैं?',
        answer: 'Flu vaccine and pneumococcal vaccine can reduce serious respiratory infections for people at higher risk, including older adults and people with asthma, COPD, diabetes, heart disease, or weak immunity. Vaccine needs vary by age and health condition, so follow local medical advice.',
        answerHi: 'फ्लू का टीका और न्यूमोकोकल टीका उच्च जोखिम वाले लोगों के लिए गंभीर श्वसन संक्रमण को कम कर सकते हैं। स्थानीय चिकित्सा सलाह का पालन करें।',
    },
    {
        category: 'Cough', categoryHi: 'खांसी',
        question: 'When does a child with cough need urgent care?', questionHi: 'खांसी वाले बच्चे को तत्काल देखभाल की आवश्यकता कब होती है?',
        answer: 'Urgent care is needed if a child has fast breathing, chest indrawing, blue lips, poor feeding, unusual sleepiness, repeated vomiting, noisy breathing, dehydration, or fever in a very young infant. Children can worsen quickly, so do not wait if breathing looks labored.',
        answerHi: 'यदि बच्चे की सांसें तेज हैं, सीना अंदर धंस रहा है, होंठ नीले हैं, दूध नहीं पी रहा है, या अत्यधिक नींद आ रही है, तो तुरंत देखभाल की आवश्यकता है।',
    },
    {
        category: 'Breathlessness', categoryHi: 'सांस फूलना',
        question: 'Can anxiety cause breathlessness?', questionHi: 'क्या चिंता (anxiety) के कारण सांस फूल सकती है?',
        answer: 'Anxiety can cause rapid breathing, chest tightness, tingling, and a feeling of not getting enough air. However, never assume anxiety first when symptoms are new, severe, or come with chest pain, fainting, wheezing, fever, or low oxygen. Rule out medical causes when in doubt.',
        answerHi: 'चिंता से तेज सांस, सीने में जकड़न और हवा की कमी महसूस हो सकती है। हालांकि, गंभीर या नए लक्षणों के मामले में पहले चिकित्सा कारणों की जांच करें।',
    },
    {
        category: 'Asthma/COPD', categoryHi: 'अस्थमा/सीओपीडी',
        question: 'What should be tracked for an asthma patient?', questionHi: 'अस्थमा के मरीज के लिए क्या ट्रैक किया जाना चाहिए?',
        answer: 'Track daytime symptoms, night waking, reliever inhaler use, activity limitation, trigger exposure, and any emergency visits. If available, peak flow readings can help identify worsening early. Frequent reliever use or night symptoms suggests control is poor and the treatment plan needs review.',
        answerHi: 'दिन के लक्षण, रात में जागना, इनहेलर का उपयोग, और ट्रिगर्स को ट्रैक करें। बार-बार इनहेलर का उपयोग बताता है कि नियंत्रण खराब है।',
    },
]

const redFlags = {
    en: [
        'Severe shortness of breath or inability to speak full sentences',
        'Blue lips, confusion, fainting, or extreme drowsiness',
        'Chest pain with breathing trouble',
        'Oxygen saturation repeatedly below 92 percent',
        'Coughing blood, severe dehydration, or worsening fever',
    ],
    hi: [
        'गंभीर सांस फूलना या पूरे वाक्य बोलने में असमर्थता',
        'नीले होंठ, भ्रम, बेहोशी, या अत्यधिक उनींदापन',
        'सांस लेने में तकलीफ के साथ सीने में दर्द',
        'ऑक्सीजन 92 प्रतिशत से कम होना',
        'खून की खांसी, गंभीर निर्जलीकरण, या बिगड़ता बुखार',
    ]
}

const quickTips = {
    en: [
        'Avoid smoking, vaping, and second-hand smoke.',
        'Keep rooms ventilated and reduce dust exposure.',
        'Use masks in heavy pollution, smoke, or dusty work areas.',
        'Take vaccines on time when advised by a clinician.',
        'Keep prescribed inhalers accessible and check technique regularly.',
        'Document oxygen, fever, and breathing rate when symptoms flare.',
    ],
    hi: [
        'धूम्रपान और दूसरों के धुएं से बचें।',
        'कमरों को हवादार रखें और धूल कम करें।',
        'भारी प्रदूषण या धूल भरे क्षेत्रों में मास्क का प्रयोग करें।',
        'डॉक्टर की सलाह पर समय पर टीके लगवाएं।',
        'निर्धारित इनहेलर पास रखें और तकनीक की जांच करें।',
        'लक्षण बढ़ने पर ऑक्सीजन, बुखार और सांस लेने की दर नोट करें।',
    ]
}

export default function RespiratoryFaqs() {
    const [lang, setLang] = useState('en')
    const [activeFaqIndex, setActiveFaqIndex] = useState(null)
    const [category, setCategory] = useState(lang === 'en' ? 'All' : 'सभी')
    const [search, setSearch] = useState('')

    const filteredFaqs = useMemo(() => {
        const query = search.trim().toLowerCase()
        return faqItems
            .map((item, index) => ({ ...item, index }))
            .filter((item) => (lang === 'en' ? category === 'All' || item.category === category : category === 'सभी' || item.categoryHi === category))
            .filter((item) => {
                if (!query) return true
                const q = lang === 'en' ? item.question : item.questionHi
                const a = lang === 'en' ? item.answer : item.answerHi
                const c = lang === 'en' ? item.category : item.categoryHi
                return `${q} ${a} ${c}`.toLowerCase().includes(query)
            })
    }, [category, search, lang])

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>{lang === 'en' ? 'Breathing And Lung FAQs' : 'श्वास और फेफड़ों के सामान्य प्रश्न (FAQs)'}</h2>
                    <p>{lang === 'en' ? 'Practical, field-friendly guidance for cough, wheezing, asthma, pneumonia, COPD, TB, oxygen checks, and urgent warning signs.' : 'खांसी, अस्थमा, निमोनिया, टीबी और ऑक्सीजन जांच के लिए व्यावहारिक मार्गदर्शन।'}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => {
                    const nextLang = lang === 'en' ? 'hi' : 'en';
                    setLang(nextLang);
                    setCategory(nextLang === 'en' ? 'All' : 'सभी');
                }}>
                    🌐 {lang === 'en' ? 'हिंदी' : 'English'}
                </button>
            </div>

            <div className="grid-3 animate-in" style={{ marginBottom: 20 }}>
                <div className="glass-card stat-card" style={{ padding: 18 }}>
                    <div style={{ color: '#06b6d4' }}><Wind size={22} /></div>
                    <div className="stat-value" style={{ fontSize: 22, color: '#06b6d4' }}>{faqItems.length}</div>
                    <div className="stat-label">{lang === 'en' ? 'Expanded Questions' : 'कुल प्रश्न'}</div>
                </div>
                <div className="glass-card stat-card" style={{ padding: 18 }}>
                    <div style={{ color: '#f59e0b' }}><AlertTriangle size={22} /></div>
                    <div className="stat-value" style={{ fontSize: 22, color: '#f59e0b' }}>{lang === 'en' ? 'Red Flags' : 'चेतावनी के संकेत'}</div>
                    <div className="stat-label">{lang === 'en' ? 'Clear escalation cues' : 'आपातकालीन संकेत'}</div>
                </div>
                <div className="glass-card stat-card" style={{ padding: 18 }}>
                    <div style={{ color: '#10b981' }}><Shield size={22} /></div>
                    <div className="stat-value" style={{ fontSize: 22, color: '#10b981' }}>{lang === 'en' ? 'Prevention' : 'रोकथाम'}</div>
                    <div className="stat-label">{lang === 'en' ? 'Smoke avoidance, masks, vaccines' : 'धुआं से बचें, मास्क, टीके'}</div>
                </div>
            </div>

            <div className="glass-card animate-in" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                        <input
                            className="form-input"
                            placeholder={lang === 'en' ? "Search cough, oxygen, TB, inhaler..." : "खोजें..."}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {categories[lang].map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setCategory(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {lang === 'en' ? `Showing ${filteredFaqs.length} of ${faqItems.length} FAQs.` : `कुल ${faqItems.length} में से ${filteredFaqs.length} प्रश्न दिखा रहे हैं।`}
                </div>
            </div>

            <div className="glass-card animate-in" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HeartPulse size={18} color="#ef4444" /> {lang === 'en' ? 'Go To A Doctor Urgently If' : 'तुरंत डॉक्टर के पास जाएं यदि'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {redFlags[lang].map((item) => (
                        <div key={item} className="glass-card glow-red" style={{ padding: 16, borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="animate-in" style={{ display: 'grid', gap: 14 }}>
                {filteredFaqs.map((item) => (
                    <div key={item.question} className="glass-card">
                        <button
                            type="button"
                            onClick={() => setActiveFaqIndex(item.index)}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                                width: '100%',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                padding: 0
                            }}
                        >
                            <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: 'rgba(6, 182, 212, 0.12)',
                                color: '#06b6d4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <CircleHelp size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                                        {item.index + 1}. {lang === 'en' ? item.question : item.questionHi}
                                    </h3>
                                    <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <div style={{ fontSize: 12, color: '#06b6d4', marginTop: 6 }}>{lang === 'en' ? item.category : item.categoryHi}</div>
                                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                                    {lang === 'en' ? item.answer.slice(0, 210) : item.answerHi.slice(0, 210)}
                                    {lang === 'en' ? (item.answer.length > 210 ? '...' : '') : (item.answerHi.length > 210 ? '...' : '')}
                                </p>
                            </div>
                        </button>
                    </div>
                ))}
            </div>

            <div className="glass-card animate-in" style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Stethoscope size={18} color="#10b981" /> {lang === 'en' ? 'Daily Lung Care Tips' : 'दैनिक फेफड़ों की देखभाल के टिप्स'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {quickTips[lang].map((tip) => (
                        <div key={tip} style={{
                            padding: 14,
                            borderRadius: 12,
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.16)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6
                        }}>
                            {tip}
                        </div>
                    ))}
                </div>
                <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {lang === 'en' ? 'Educational guidance only. It does not replace a qualified doctor, emergency service, or local clinical protocol.' : 'केवल शैक्षिक मार्गदर्शन। यह योग्य डॉक्टर, आपातकालीन सेवा या स्थानीय नैदानिक प्रोटोकॉल का विकल्प नहीं है।'}
                </p>
            </div>

            {activeFaqIndex !== null && (
                <div
                    onClick={() => setActiveFaqIndex(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.65)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        zIndex: 1200
                    }}
                >
                    <div
                        className="glass-card"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 760,
                            padding: 24,
                            border: '1px solid var(--border-glass)',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 12, color: '#06b6d4', marginBottom: 8 }}>{lang === 'en' ? faqItems[activeFaqIndex].category : faqItems[activeFaqIndex].categoryHi}</div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>
                                    {activeFaqIndex + 1}. {lang === 'en' ? faqItems[activeFaqIndex].question : faqItems[activeFaqIndex].questionHi}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveFaqIndex(null)}
                                style={{
                                    border: '1px solid var(--border-glass)',
                                    background: 'var(--bg-glass)',
                                    color: 'var(--text-secondary)',
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label="Close FAQ popup"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                            {lang === 'en' ? faqItems[activeFaqIndex].answer : faqItems[activeFaqIndex].answerHi}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
