import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { sendNotifyLkSms, getNotifyLkBalance, compilePaymentSmsTemplate, compileRegistrationSmsTemplate, formatSriLankanPhone } from './sms.js';

export const router = Router();

// ==========================================
// 1. AI SPELL CHECK & AUTO-CORRECT ROUTE
// ==========================================

const commonCorrections: Record<string, string> = {
  frist: 'First',
  inverstment: 'Investment',
  inverstments: 'Investments',
  payut: 'Payout',
  salry: 'Salary',
  expence: 'Expense',
  expences: 'Expenses',
  incme: 'Income',
  thinks: 'Things',
  cabel: 'Cable',
  houseing: 'Housing',
  grocerie: 'Groceries',
  groceries: 'Groceries',
  dyning: 'Dining',
  utilitis: 'Utilities',
};

router.post('/ai/autocorrect', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required' });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return res.json({ correctedText: '' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an AI English spell checker and grammar polisher for financial ledger entries.
Correct all spelling mistakes, typos, and formatting errors in the following text: "${trimmed}".
Return ONLY the corrected, clean English title-cased phrase without quotes, explanations, or punctuation at the end.`,
        });

        const corrected = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : '';
        if (corrected) {
          return res.json({ correctedText: corrected });
        }
      } catch (geminiError: any) {
        console.warn('Gemini AI error, using rule-based autocorrect fallback:', geminiError.message);
      }
    }

    // Rule-based smart fallback
    const words = trimmed.split(/\s+/);
    const correctedWords = words.map((w) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (commonCorrections[clean]) {
        return commonCorrections[clean];
      }
      if (w.length > 0) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    });

    const correctedText = correctedWords.join(' ');
    res.json({ correctedText });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Auto-correct failed' });
  }
});

// ==========================================
// 1.1 AI BUSINESS PERFORMANCE & HEALTH ADVISOR
// ==========================================

interface RuleInsightParams {
  isTamil: boolean;
  score: number;
  healthStatus: 'Excellent' | 'Good' | 'Moderate' | 'Needs Attention' | 'Critical';
  collectionGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPct: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyNet: number;
  monthlySavingsRatePct: number;
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  currentMonthBilled: number;
  currentMonthCollected: number;
  collectionRatePct: number;
  totalPendingArrears: number;
  topExpenseName: string;
  topExpenseAmount: number;
  projectedNextMonthRevenue: number;
  activeSubscriberRatePct: number;
  companyName: string;
}

function generateRuleBasedInsights(p: RuleInsightParams) {
  const {
    isTamil,
    score,
    healthStatus,
    collectionGrade,
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMarginPct,
    monthlyRevenue,
    monthlyExpenses,
    monthlyNet,
    monthlySavingsRatePct,
    totalSubscribers,
    activeSubscribers,
    inactiveSubscribers,
    currentMonthBilled,
    currentMonthCollected,
    collectionRatePct,
    totalPendingArrears,
    topExpenseName,
    topExpenseAmount,
    projectedNextMonthRevenue,
    activeSubscriberRatePct,
    companyName,
  } = p;

  if (isTamil) {
    let verdict = '';
    if (score >= 85) {
      verdict = `${companyName} மிகச் சிறந்த நிதி ஆரோக்கியத்துடனும் (${profitMarginPct.toFixed(1)}% லாப வரம்பு) வலுவான சந்தாதாரர் ஆதரவுடனும் வெற்றிகரமாக இயங்கி வருகிறது.`;
    } else if (score >= 70) {
      verdict = `${companyName} நல்ல நிதி ஸ்திரத்தன்மை மற்றும் தொடர்ச்சியான பணப்புழக்கத்துடன் இயங்கி வருகிறது; நிலுவைக் கட்டணங்களை விரைந்து வசூலித்தால் லாபம் மேலும் அதிகரிக்கும்.`;
    } else if (score >= 55) {
      verdict = `${companyName} மிதமான லாபத்துடன் இயங்கி வருகிறது. சந்தாதாரர்களின் மாதாந்திர கட்டண வசூல் வீதத்தை (தற்போது ${collectionRatePct.toFixed(1)}%) அதிகரிப்பது அவசியமாகும்.`;
    } else {
      verdict = `பணப்புழக்கம் மற்றும் நிலுவையில் உள்ள கட்டணங்கள் (Rs. ${totalPendingArrears.toLocaleString()}) காரணமாக நிதி நிர்வாகத்தில் தீவிர உடனடி கவனம் தேவைப்படுகிறது.`;
    }

    const summary = `${companyName} நிறுவனத்தின் மொத்த வருமானம் Rs. ${totalRevenue.toLocaleString()} ஆகவும், மொத்த செலவுகள் Rs. ${totalExpenses.toLocaleString()} ஆகவும் உள்ள நிலையில், நிகர நிதி இருப்பு Rs. ${netProfit.toLocaleString()} (${profitMarginPct.toFixed(1)}% லாப வரம்பு) ஆக உள்ளது. நடப்பு மாதத்தில் Rs. ${monthlyRevenue.toLocaleString()} வருவாயும், Rs. ${monthlyExpenses.toLocaleString()} செலவும் பதிவாகியுள்ளது. தற்போது மொத்தமுள்ள ${totalSubscribers} வாடிக்கையாளர்களில் ${activeSubscribers} பேர் தீவிர சேவையில் உள்ளனர். மாதாந்திர கட்டண வசூலில் இதுவரை Rs. ${currentMonthCollected.toLocaleString()} (${collectionRatePct.toFixed(1)}%) வசூலிக்கப்பட்டுள்ளது.`;

    const strengths: string[] = [
      `வலுவான லாப வரம்பு: மொத்த வருவாயில் ${profitMarginPct.toFixed(1)}% நிகர நிதி இருப்பாக பாதுகாப்பாக தக்கவைக்கப்பட்டுள்ளது.`,
      `நிலையான சந்தாதாரர் தளம்: ${activeSubscribers} தீவிர வாடிக்கையாளர்களுடன் (${activeSubscriberRatePct.toFixed(1)}% retention) தொடர்ச்சியான மாதாந்திர வருவாய் உறுதியாகிறது.`,
      monthlyNet >= 0
        ? `நடப்பு மாத நேர்மறை பணப்புழக்கம்: நிகர சேமிப்பு Rs. ${monthlyNet.toLocaleString()} (${monthlySavingsRatePct.toFixed(1)}% சேமிப்பு விகிதம்).`
        : `முழுமையான மூலதன இருப்பு: முந்தைய மாதங்களின் சேமிப்புடன் Rs. ${netProfit.toLocaleString()} கையிருப்பு உள்ளது.`,
      `அடுத்த மாத உத்தேச வருவாய் மதிப்பீடு: செயலில் உள்ள வாடிக்கையாளர்கள் மூலம் சுமார் Rs. ${projectedNextMonthRevenue.toLocaleString()} வரவு எதிர்பார்க்கப்படுகிறது.`,
    ];

    const risks: string[] = [];
    if (totalPendingArrears > 0) {
      risks.push(`நிலுவைக் கட்டண அபாயம்: வாடிக்கையாளர்களிடமிருந்து வசூலிக்கப்பட வேண்டிய மொத்த பாக்கித் தொகை Rs. ${totalPendingArrears.toLocaleString()} ஆக உள்ளது.`);
    }
    if (inactiveSubscribers > 0) {
      risks.push(`செயலிழந்த சந்தாதாரர்கள்: ${inactiveSubscribers} வாடிக்கையாளர்கள் துண்டிக்கப்பட்டுள்ளதால் மாதத்திற்கு சுமார் Rs. ${(inactiveSubscribers * 1200).toLocaleString()} வருமான இழப்பு ஏற்படுகிறது.`);
    }
    if (topExpenseAmount > 0) {
      risks.push(`முக்கிய செலவினப் பிரிவு: "${topExpenseName}" பிரிவில் Rs. ${topExpenseAmount.toLocaleString()} செலவாகியுள்ளது; இதில் சிக்கனம் கடைப்பிடிக்கலாம்.`);
    }
    if (risks.length === 0) {
      risks.push(`செயல்பாட்டுச் செலவுகள் தொடர்ந்து கண்காணிக்கப்பட வேண்டும்.`);
    }

    const recommendations: string[] = [
      `நிலுவை வைத்துள்ள வாடிக்கையாளர்களுக்கு Payment Reminder SMS உடனே அனுப்பி பாக்கித் தொகையை (Rs. ${totalPendingArrears.toLocaleString()}) விரைவாக வசூலியுங்கள்.`,
      `Standard பேக்கேஜில் உள்ள வாடிக்கையாளர்களை Premium HD பேக்கேஜிற்கு (LKR 1,800) Upgrade செய்ய விளம்பரப்படுத்தி மாதாந்திர வருமானத்தை உயர்த்துங்கள்.`,
      inactiveSubscribers > 0
        ? `செயலிழந்த ${inactiveSubscribers} வாடிக்கையாளர்களுக்கு சிறப்பு மறு இணைப்பு சலுகை (Reconnection Offer) வழங்கி மீண்டும் கேபிள் சேவையைத் தொடரச் செய்யுங்கள்.`
        : `புதிய வீடுகளுக்கு விளம்பர துண்டுப் பிரசுரங்கள் வழங்கி புதிய கேபிள் இணைப்புகளை அதிகரியுங்கள்.`,
      `மாதாந்திர செயல்பாட்டுச் செலவுகளை மொத்த வருவாயில் 35% முதல் 40%-க்குள் கட்டுப்படுத்தி பாதுகாப்பான அவசரகால நிதி இருப்பை உருவாக்குங்கள்.`,
    ];

    return {
      healthScore: score,
      healthStatus,
      verdict,
      summary,
      strengths,
      risks,
      recommendations,
      projectedNextMonthRevenue,
      collectionGrade,
      profitMarginPct: Number(profitMarginPct.toFixed(1)),
      collectionRatePct: Number(collectionRatePct.toFixed(1)),
      activeSubscriberRatePct: Number(activeSubscriberRatePct.toFixed(1)),
      generatedAt: new Date().toISOString(),
      language: 'ta' as const,
      isAiGenerated: false,
    };
  } else {
    let verdict = '';
    if (score >= 85) {
      verdict = `${companyName} is performing exceptionally well with a stellar profit margin of ${profitMarginPct.toFixed(1)}% and robust subscriber retention.`;
    } else if (score >= 70) {
      verdict = `${companyName} demonstrates solid financial health and positive cashflow; accelerating monthly bill collections will further unlock liquidity.`;
    } else if (score >= 55) {
      verdict = `${companyName} is maintaining moderate operating stability, but requires tighter collection management (current collection efficiency: ${collectionRatePct.toFixed(1)}%).`;
    } else {
      verdict = `Critical attention is required on uncollected bill arrears (Rs. ${totalPendingArrears.toLocaleString()}) and operational expense controls to restore cash reserves.`;
    }

    const summary = `${companyName} has recorded total lifetime revenue of Rs. ${totalRevenue.toLocaleString()} against total expenses of Rs. ${totalExpenses.toLocaleString()}, maintaining a healthy net reserve of Rs. ${netProfit.toLocaleString()} (${profitMarginPct.toFixed(1)}% margin). In the current billing cycle, cash inflows reached Rs. ${monthlyRevenue.toLocaleString()} with operational burn of Rs. ${monthlyExpenses.toLocaleString()}. Active subscriber penetration stands at ${activeSubscriberRatePct.toFixed(1)}% across ${totalSubscribers} registered homes.`;

    const strengths: string[] = [
      `Strong Operating Margin: ${profitMarginPct.toFixed(1)}% of all-time revenues have been retained as net cash reserves.`,
      `Stable Recurring Subscriber Base: ${activeSubscribers} active subscribers drive consistent, predictable monthly subscriptions.`,
      monthlyNet >= 0
        ? `Positive Current Month Cashflow: Net savings of Rs. ${monthlyNet.toLocaleString()} (${monthlySavingsRatePct.toFixed(1)}% savings rate).`
        : `Resilient Reserve Buffer: Healthy cumulative reserve of Rs. ${netProfit.toLocaleString()}.`,
      `Projected Pipeline: Estimated recurring inflow of Rs. ${projectedNextMonthRevenue.toLocaleString()} for the upcoming month.`,
    ];

    const risks: string[] = [];
    if (totalPendingArrears > 0) {
      risks.push(`Uncollected Dues Risk: Outstanding arrears across subscribers total Rs. ${totalPendingArrears.toLocaleString()}.`);
    }
    if (inactiveSubscribers > 0) {
      risks.push(`Subscriber Churn: ${inactiveSubscribers} inactive accounts represent approximately Rs. ${(inactiveSubscribers * 1200).toLocaleString()}/month in unearned potential revenue.`);
    }
    if (topExpenseAmount > 0) {
      risks.push(`Top Expense Exposure: "${topExpenseName}" represents the largest operational outflow at Rs. ${topExpenseAmount.toLocaleString()}.`);
    }
    if (risks.length === 0) {
      risks.push(`Routine operational overhead must continue to be monitored against revenue velocity.`);
    }

    const recommendations: string[] = [
      `Dispatch automated SMS payment reminders to accounts with overdue balances to recover Rs. ${totalPendingArrears.toLocaleString()} in arrears.`,
      `Upsell active subscribers on Standard packages to Premium HD (LKR 1,800) with sports/movie packages to expand Average Revenue Per User (ARPU).`,
      inactiveSubscribers > 0
        ? `Launch a targeted Win-Back campaign offering zero reconnection fee for ${inactiveSubscribers} inactive subscribers.`
        : `Expand optical fiber / RF distribution to neighboring streets to capture new household connections.`,
      `Cap monthly operational overhead strictly beneath 40% of recurring inflows to compound cash reserves.`,
    ];

    return {
      healthScore: score,
      healthStatus,
      verdict,
      summary,
      strengths,
      risks,
      recommendations,
      projectedNextMonthRevenue,
      collectionGrade,
      profitMarginPct: Number(profitMarginPct.toFixed(1)),
      collectionRatePct: Number(collectionRatePct.toFixed(1)),
      activeSubscriberRatePct: Number(activeSubscriberRatePct.toFixed(1)),
      generatedAt: new Date().toISOString(),
      language: 'en' as const,
      isAiGenerated: false,
    };
  }
}

router.post('/ai/business-insights', async (req, res) => {
  try {
    const { language = 'ta', metrics } = req.body;
    const isTamil = language === 'ta';

    let totalRevenue = Number(metrics?.totalRevenue ?? 0);
    let totalExpenses = Number(metrics?.totalExpenses ?? 0);
    let netProfit = Number(metrics?.netProfit ?? (totalRevenue - totalExpenses));
    let profitMarginPct = Number(metrics?.profitMarginPct ?? (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0));
    let monthlyRevenue = Number(metrics?.monthlyRevenue ?? 0);
    let monthlyExpenses = Number(metrics?.monthlyExpenses ?? 0);
    let monthlyNet = Number(metrics?.monthlyNet ?? (monthlyRevenue - monthlyExpenses));
    let monthlySavingsRatePct = Number(metrics?.monthlySavingsRatePct ?? (monthlyRevenue > 0 ? (monthlyNet / monthlyRevenue) * 100 : 0));
    let totalSubscribers = Number(metrics?.totalSubscribers ?? 0);
    let activeSubscribers = Number(metrics?.activeSubscribers ?? 0);
    let inactiveSubscribers = Number(metrics?.inactiveSubscribers ?? 0);
    let currentMonthBilled = Number(metrics?.currentMonthBilled ?? 0);
    let currentMonthCollected = Number(metrics?.currentMonthCollected ?? 0);
    let currentMonthPending = Number(metrics?.currentMonthPending ?? 0);
    let collectionRatePct = Number(metrics?.collectionRatePct ?? (currentMonthBilled > 0 ? (currentMonthCollected / currentMonthBilled) * 100 : 0));
    let totalPendingArrears = Number(metrics?.totalPendingArrears ?? 0);
    let arpu = Number(metrics?.arpu ?? (activeSubscribers > 0 ? monthlyRevenue / activeSubscribers : 0));
    let topExpenseName = metrics?.topExpenseCategoryName || 'Operations & Maintenance';
    let topExpenseAmount = Number(metrics?.topExpenseCategoryAmount ?? 0);
    let companyName = metrics?.companyName || 'ASK CABLE TV NETWORK';

    // Fallback: If metrics were not passed, fetch live from database
    if (totalRevenue === 0 && totalSubscribers === 0) {
      try {
        const [incomes, expenses, customers, payments] = await Promise.all([
          db.getIncomes(),
          db.getExpenses(),
          db.getCustomers(),
          db.getMonthlyPayments(),
        ]);
        totalRevenue = incomes.reduce((s, i) => s + i.amount, 0);
        totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        netProfit = totalRevenue - totalExpenses;
        profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        totalSubscribers = customers.length;
        activeSubscribers = customers.filter(c => (c.status || 'ACTIVE') === 'ACTIVE').length;
        inactiveSubscribers = totalSubscribers - activeSubscribers;
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue = incomes.filter(i => i.date.startsWith(curMonth)).reduce((s, i) => s + i.amount, 0);
        monthlyExpenses = expenses.filter(e => e.date.startsWith(curMonth)).reduce((s, e) => s + e.amount, 0);
        monthlyNet = monthlyRevenue - monthlyExpenses;
        monthlySavingsRatePct = monthlyRevenue > 0 ? (monthlyNet / monthlyRevenue) * 100 : 0;
        const curBills = payments.filter(p => p.month === curMonth);
        currentMonthBilled = curBills.reduce((s, b) => s + b.monthlyFee, 0);
        currentMonthCollected = curBills.reduce((s, b) => s + b.paidAmount, 0);
        currentMonthPending = curBills.reduce((s, b) => s + b.balanceAmount, 0);
        collectionRatePct = currentMonthBilled > 0 ? (currentMonthCollected / currentMonthBilled) * 100 : 0;
        totalPendingArrears = payments.reduce((s, p) => s + p.balanceAmount, 0);
        arpu = activeSubscribers > 0 ? monthlyRevenue / activeSubscribers : 0;
      } catch (dbErr) {
        // fallback
      }
    }

    const activeSubscriberRatePct = totalSubscribers > 0 ? (activeSubscribers / totalSubscribers) * 100 : 100;
    const projectedNextMonthRevenue = Math.round(activeSubscribers * (arpu > 500 ? arpu : 1200));

    // Calculate Comprehensive Financial Health Score (0 - 100)
    let score = 0;
    if (profitMarginPct >= 45) score += 30;
    else if (profitMarginPct >= 30) score += 25;
    else if (profitMarginPct >= 15) score += 20;
    else if (profitMarginPct > 0) score += 15;
    else score += 5;

    if (collectionRatePct >= 90) score += 30;
    else if (collectionRatePct >= 75) score += 25;
    else if (collectionRatePct >= 60) score += 18;
    else if (collectionRatePct >= 40) score += 12;
    else score += 6;

    if (activeSubscriberRatePct >= 90) score += 20;
    else if (activeSubscriberRatePct >= 80) score += 16;
    else if (activeSubscriberRatePct >= 65) score += 12;
    else score += 6;

    if (monthlyNet > 0 && monthlySavingsRatePct >= 30) score += 20;
    else if (monthlyNet > 0) score += 15;
    else if (monthlyNet === 0) score += 10;
    else score += 5;

    score = Math.min(100, Math.max(25, Math.round(score)));

    let healthStatus: 'Excellent' | 'Good' | 'Moderate' | 'Needs Attention' | 'Critical';
    let collectionGrade: 'A+' | 'A' | 'B' | 'C' | 'D';

    if (score >= 85) { healthStatus = 'Excellent'; collectionGrade = 'A+'; }
    else if (score >= 70) { healthStatus = 'Good'; collectionGrade = 'A'; }
    else if (score >= 55) { healthStatus = 'Moderate'; collectionGrade = 'B'; }
    else if (score >= 40) { healthStatus = 'Needs Attention'; collectionGrade = 'C'; }
    else { healthStatus = 'Critical'; collectionGrade = 'D'; }

    // Check Gemini AI API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const promptLang = isTamil
          ? 'Respond entirely in fluent, natural, professional Tamil (தமிழ்) for verdict, summary, strengths, risks, and recommendations, while strictly keeping JSON keys in English.'
          : 'Respond in professional corporate executive English for all fields.';

        const prompt = `You are a Chief Financial Officer (CFO) and Business Intelligence Auditor analyzing "${companyName}", a Cable TV Network operator in Sri Lanka (Currency: Sri Lankan Rupees - Rs. / LKR).

Financial & Performance Metrics:
- All-Time Total Revenue: Rs. ${totalRevenue.toLocaleString()}
- All-Time Total Expenses: Rs. ${totalExpenses.toLocaleString()}
- Net Reserve / Cash Balance: Rs. ${netProfit.toLocaleString()}
- Overall Profit Margin: ${profitMarginPct.toFixed(1)}%
- Current Month Inflow: Rs. ${monthlyRevenue.toLocaleString()}
- Current Month Expenses: Rs. ${monthlyExpenses.toLocaleString()}
- Current Month Net Cashflow: Rs. ${monthlyNet.toLocaleString()}
- Current Month Savings Rate: ${monthlySavingsRatePct.toFixed(1)}%
- Total Registered Subscribers: ${totalSubscribers} (${activeSubscribers} Active, ${inactiveSubscribers} Inactive)
- Monthly Cable Bills: Total Billed Rs. ${currentMonthBilled.toLocaleString()}, Collected Rs. ${currentMonthCollected.toLocaleString()}, Collection Rate ${collectionRatePct.toFixed(1)}%
- Uncollected Pending Arrears: Rs. ${totalPendingArrears.toLocaleString()}
- Top Expense Category: ${topExpenseName} (Rs. ${topExpenseAmount.toLocaleString()})
- Calculated Health Score: ${score}/100 (${healthStatus})

${promptLang}

Respond with ONLY a raw JSON object (no markdown code blocks, no backticks, no extra text) with the following exact keys:
{
  "verdict": "A sharp, impactful 1-2 sentence executive verdict directly summarizing whether the business is healthy, growing, or facing collection friction.",
  "summary": "A 3-4 sentence comprehensive business analysis covering revenue stability, subscriber collection performance, and expense management.",
  "strengths": ["3 clear bullet points highlighting key business strengths and achievements"],
  "risks": ["2-3 bullet points highlighting financial risks, uncollected arrears, or operational leakages"],
  "recommendations": ["3-4 actionable growth and cashflow maximization steps tailored specifically for a Cable TV business (e.g. SMS payment reminders, package tier upgrades, reconnecting inactive subscribers, expense control)"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const rawText = response.text ? response.text.trim().replace(/^```json/i, '').replace(/```$/i, '').trim() : '';
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.verdict && Array.isArray(parsed.strengths) && Array.isArray(parsed.recommendations)) {
            return res.json({
              healthScore: score,
              healthStatus,
              verdict: parsed.verdict,
              summary: parsed.summary || parsed.verdict,
              strengths: parsed.strengths,
              risks: parsed.risks || [],
              recommendations: parsed.recommendations,
              projectedNextMonthRevenue,
              collectionGrade,
              profitMarginPct: Number(profitMarginPct.toFixed(1)),
              collectionRatePct: Number(collectionRatePct.toFixed(1)),
              activeSubscriberRatePct: Number(activeSubscriberRatePct.toFixed(1)),
              generatedAt: new Date().toISOString(),
              language,
              isAiGenerated: true,
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini AI business insight generation error, falling back to smart rule engine:', geminiErr.message);
      }
    }

    // High precision smart rule engine fallback
    const fallbackInsights = generateRuleBasedInsights({
      isTamil,
      score,
      healthStatus,
      collectionGrade,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMarginPct,
      monthlyRevenue,
      monthlyExpenses,
      monthlyNet,
      monthlySavingsRatePct,
      totalSubscribers,
      activeSubscribers,
      inactiveSubscribers,
      currentMonthBilled,
      currentMonthCollected,
      collectionRatePct,
      totalPendingArrears,
      topExpenseName,
      topExpenseAmount,
      projectedNextMonthRevenue,
      activeSubscriberRatePct,
      companyName,
    });

    return res.json(fallbackInsights);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate business insights' });
  }
});

// ==========================================
// 2. CATEGORIES ROUTES
// ==========================================

router.get('/categories', async (_req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Category name and type (INCOME or EXPENSE) are required' });
    }
    const cat = await db.createCategory({ name, type, icon, color });
    res.status(201).json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const cat = await db.updateCategory(req.params.id, req.body);
    res.json({ category: cat });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const success = await db.deleteCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 3. INCOMES ROUTES
// ==========================================

router.get('/incomes', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const incomes = await db.getIncomes({
      categoryId: categoryId as string,
      search: search as string,
    });
    res.json({ incomes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch incomes' });
  }
});

router.post('/incomes', async (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required income fields' });
    }

    const income = await db.createIncome({
      categoryId,
      amount: Number(amount),
      date,
      description,
      paymentMethod,
      tags,
    });
    res.status(201).json({ income });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create income record' });
  }
});

router.put('/incomes/:id', async (req, res) => {
  try {
    const income = await db.updateIncome(req.params.id, req.body);
    res.json({ income });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update income record' });
  }
});

router.delete('/incomes/:id', async (req, res) => {
  try {
    const success = await db.deleteIncome(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Income record not found' });
    }
    res.json({ message: 'Income record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4. EXPENSES ROUTES
// ==========================================

router.get('/expenses', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const expenses = await db.getExpenses({
      categoryId: categoryId as string,
      search: search as string,
    });
    res.json({ expenses });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch expenses' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { categoryId, amount, date, description, paymentMethod, tags } = req.body;
    if (!categoryId || amount === undefined || !date || !description) {
      return res.status(400).json({ error: 'Missing required expense fields' });
    }

    const expense = await db.createExpense({
      categoryId,
      amount: Number(amount),
      date,
      description,
      paymentMethod,
      tags,
    });
    res.status(201).json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create expense record' });
  }
});

router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await db.updateExpense(req.params.id, req.body);
    res.json({ expense });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update expense record' });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const success = await db.deleteExpense(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json({ message: 'Expense record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4.5. CUSTOMERS ROUTES
// ==========================================

router.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;
    const customers = await db.getCustomers(search as string);
    res.json({ customers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customers' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, nicNo, phoneNo, address, boxNo, totalAmount, paidAmount, packageId, packageName, monthlyFee } = req.body;
    if (!name || !nicNo || !phoneNo || !boxNo) {
      return res.status(400).json({ error: 'Customer Name, NIC No, Phone No, and Box No are required' });
    }
    const customer = await db.createCustomer({
      name,
      nicNo,
      phoneNo,
      address: address || '',
      boxNo,
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
      packageId: packageId || undefined,
      packageName: packageName || undefined,
      monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : undefined,
    });
    res.status(201).json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await db.updateCustomer(req.params.id, req.body);
    res.json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const success = await db.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 4.6. MONTHLY PAYMENTS ROUTES
// ==========================================

router.get('/monthly-payments', async (req, res) => {
  try {
    const { month, customerId, search, status } = req.query;
    const payments = await db.getMonthlyPayments({
      month: month as string,
      customerId: customerId as string,
      search: search as string,
      status: status as string,
    });
    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch monthly payments' });
  }
});

router.post('/monthly-payments', async (req, res) => {
  try {
    const { customerId, month, monthlyFee, paidAmount, paymentDate, packageId, packageName } = req.body;
    if (!customerId || !month || monthlyFee === undefined) {
      return res.status(400).json({ error: 'Customer, Month, and Monthly Fee are required' });
    }
    const payment = await db.createMonthlyPayment({
      customerId,
      month,
      monthlyFee: Number(monthlyFee),
      paidAmount: Number(paidAmount || 0),
      paymentDate,
      packageId,
      packageName,
    });
    res.status(201).json({ payment });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record monthly payment' });
  }
});

router.post('/monthly-payments/bulk', async (req, res) => {
  try {
    const { month, defaultFee, packageMap } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Month (YYYY-MM) is required for bulk creation' });
    }

    const result = await db.bulkCreateMonthlyPayments({
      month,
      defaultFee: defaultFee ? Number(defaultFee) : 1200,
      packageMap: packageMap && typeof packageMap === 'object' ? packageMap : undefined,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to bulk create monthly payments' });
  }
});

router.put('/monthly-payments/:id', async (req, res) => {
  try {
    const payment = await db.updateMonthlyPayment(req.params.id, req.body);
    res.json({ payment });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update monthly payment' });
  }
});

router.delete('/monthly-payments/:id', async (req, res) => {
  try {
    const success = await db.deleteMonthlyPayment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Monthly payment record not found' });
    }
    res.json({ message: 'Monthly payment record deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 5. ANALYTICS ROUTES
// ==========================================

router.get('/analytics/overview', async (_req, res) => {
  try {
    const analytics = await db.getAnalyticsOverview();
    res.json({ analytics });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate analytics overview' });
  }
});

// CSV Exports
router.get('/export/incomes-csv', async (_req, res) => {
  try {
    const recs = await db.getIncomes();
    let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
    for (const r of recs) {
      csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=incomes_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).send('CSV export failed');
  }
});

router.get('/export/expenses-csv', async (_req, res) => {
  try {
    const recs = await db.getExpenses();
    let csv = 'ID,Date,Category,Amount,Description,Payment Method\n';
    for (const r of recs) {
      csv += `"${r.id}","${r.date}","${r.categoryName || ''}",${r.amount},"${r.description.replace(/"/g, '""')}","${r.paymentMethod}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).send('CSV export failed');
  }
});

// ==========================================
// 6. SCHEMA & DATABASE INSPECTOR ROUTES
// ==========================================

router.get('/schema/sql', (_req, res) => {
  const sql = `-- =========================================================================
-- ASK CABLE — INCOMES, EXPENSES & CATEGORIES SCHEMA
-- =========================================================================

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
    color VARCHAR(20) NOT NULL DEFAULT '#10B981',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incomes (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    income_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incomes_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);`;
  res.json({ sql });
});

router.get('/database/tables', async (_req, res) => {
  try {
    const tables = await db.getTablesMeta();
    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/database/tables/:tableName', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await db.getTableData(req.params.tableName, page, limit);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/database/tables/:tableName/rows', async (req, res) => {
  try {
    const row = await db.insertTableRow(req.params.tableName, req.body);
    res.status(201).json({ row, message: 'Row inserted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/database/tables/:tableName/rows/:rowId', async (req, res) => {
  try {
    const success = await db.deleteTableRow(req.params.tableName, req.params.rowId);
    res.json({ success });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/database/query', async (req, res) => {
  try {
    const { sql } = req.body;
    const result = await db.executeSql(sql || '');
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT API
// ==========================================
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ user, message: 'Login successful' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    const user = await db.createUser({ username, password, name, role: role || 'STAFF' });
    res.status(201).json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/auth/users/:id', async (req, res) => {
  try {
    await db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// SYSTEM SETTINGS & STAFF PRIVILEGES API
// ==========================================
router.get('/settings/staff-privileges', async (_req, res) => {
  try {
    const privileges = await db.getStaffPrivileges();
    res.json({ privileges });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch staff privileges' });
  }
});

router.post('/settings/staff-privileges', async (req, res) => {
  try {
    const { privileges } = req.body;
    if (!privileges || typeof privileges !== 'object') {
      return res.status(400).json({ error: 'Privileges object is required' });
    }

    await db.setStaffPrivileges(privileges);
    res.json({ privileges, message: 'Staff privileges updated in database' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update staff privileges' });
  }
});

router.get('/settings/system-profile', async (_req, res) => {
  try {
    const profile = await db.getSystemProfile();
    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch system profile' });
  }
});

router.post('/settings/system-profile', async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Profile object is required' });
    }

    const updated = await db.setSystemProfile(profile);
    res.json({ profile: updated, message: 'System profile saved to database' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save system profile' });
  }
});

// ==========================================
// SMS GATEWAY & NOTIFICATIONS API
// ==========================================
router.get('/settings/sms', async (_req, res) => {
  try {
    const smsSettings = await db.getSmsSettings();
    res.json({ smsSettings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch SMS settings' });
  }
});

router.post('/settings/sms', async (req, res) => {
  try {
    const { smsSettings } = req.body;
    if (!smsSettings || typeof smsSettings !== 'object') {
      return res.status(400).json({ error: 'SMS settings object is required' });
    }

    const updated = await db.setSmsSettings(smsSettings);
    res.json({ smsSettings: updated, message: 'SMS settings saved to database' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save SMS settings' });
  }
});

router.post('/sms/test', async (req, res) => {
  try {
    const { phone, message, userId, apiKey, senderId } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Recipient phone number is required' });
    }

    // Load settings from DB if not provided in body
    const savedSettings = await db.getSmsSettings();
    const effectiveUserId = (userId || savedSettings.userId || '').trim();
    const effectiveApiKey = (apiKey || savedSettings.apiKey || '').trim();
    const effectiveSenderId = (senderId || savedSettings.senderId || 'NotifyDEMO').trim();

    if (!effectiveUserId || !effectiveApiKey) {
      return res.status(400).json({
        error: 'Notify.lk User ID and API Key are required. Please configure and save them first.',
      });
    }

    const testMsg = message || 'Test message from ASK Cable TV billing system via Notify.lk.';
    const result = await sendNotifyLkSms({
      to: phone,
      message: testMsg,
      userId: effectiveUserId,
      apiKey: effectiveApiKey,
      senderId: effectiveSenderId,
    });

    await db.logSms({
      type: 'TEST',
      recipientPhone: phone,
      message: testMsg,
      senderId: effectiveSenderId,
      status: result.success ? 'DELIVERED' : 'FAILED',
      gatewayResponse: result.message || JSON.stringify(result.data || ''),
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.message, ...result });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send test SMS' });
  }
});

router.post('/sms/send-payment', async (req, res) => {
  try {
    const { customerName, phoneNo, boxNo, paidAmount, balanceAmount, month, paymentDate, billNo } = req.body;

    if (!phoneNo || !customerName) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const smsSettings = await db.getSmsSettings();
    if (!smsSettings.enabled) {
      return res.json({
        success: false,
        skipped: true,
        message: 'SMS notifications are currently disabled in Settings.',
      });
    }

    if (!smsSettings.userId || !smsSettings.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Notify.lk User ID and API Key are not configured in Settings > SMS Gateway.',
      });
    }

    const profile = await db.getSystemProfile();
    const companyName = profile?.companyName || 'ASK CABLE TV NETWORK';

    const compiledText = compilePaymentSmsTemplate(smsSettings.paymentSmsTemplate, {
      customerName,
      boxNo: String(boxNo || ''),
      paidAmount: Number(paidAmount || 0),
      balanceAmount: Number(balanceAmount || 0),
      month: month || '',
      date: paymentDate || new Date().toISOString().split('T')[0],
      companyName,
    });

    const result = await sendNotifyLkSms({
      to: phoneNo,
      message: compiledText,
      userId: smsSettings.userId,
      apiKey: smsSettings.apiKey,
      senderId: smsSettings.senderId || 'NotifyDEMO',
    });

    await db.logSms({
      type: 'PAYMENT',
      recipientPhone: phoneNo,
      customerName,
      boxNo: String(boxNo || ''),
      message: compiledText,
      senderId: smsSettings.senderId || 'NotifyDEMO',
      status: result.success ? 'DELIVERED' : 'FAILED',
      gatewayResponse: result.message || JSON.stringify(result.data || ''),
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Payment SMS dispatched to ${phoneNo}`,
        compiledText,
        data: result.data,
      });
    } else {
      res.status(400).json({ error: result.message, ...result });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch payment SMS' });
  }
});

router.post('/sms/send-registration', async (req, res) => {
  try {
    const { customerName, phoneNo, boxNo, totalAmount, paidAmount, balanceAmount, registrationDate } = req.body;

    if (!phoneNo || !customerName) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const smsSettings = await db.getSmsSettings();
    if (!smsSettings.enabled) {
      return res.json({
        success: false,
        skipped: true,
        message: 'SMS notifications are currently disabled in Settings.',
      });
    }

    if (!smsSettings.userId || !smsSettings.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Notify.lk User ID and API Key are not configured in Settings > SMS Gateway.',
      });
    }

    const profile = await db.getSystemProfile();
    const companyName = profile?.companyName || 'ASK CABLE TV NETWORK';
    const companyPhone = profile?.phone || '';

    const template = smsSettings.registrationSmsTemplate || 'Welcome {customerName}! Your ASK Cable TV registration for Box #{boxNo} is successful on {date}. Total Fee: Rs. {totalAmount}, Paid: Rs. {paidAmount}, Balance: Rs. {balanceAmount}. Helpline: {companyPhone}. Thank you, {companyName}.';

    const compiledText = compileRegistrationSmsTemplate(template, {
      customerName,
      boxNo: String(boxNo || ''),
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
      balanceAmount: Number(balanceAmount || 0),
      date: registrationDate || new Date().toISOString().split('T')[0],
      companyName,
      companyPhone,
    });

    const result = await sendNotifyLkSms({
      to: phoneNo,
      message: compiledText,
      userId: smsSettings.userId,
      apiKey: smsSettings.apiKey,
      senderId: smsSettings.senderId || 'NotifyDEMO',
    });

    await db.logSms({
      type: 'REGISTRATION',
      recipientPhone: phoneNo,
      customerName,
      boxNo: String(boxNo || ''),
      message: compiledText,
      senderId: smsSettings.senderId || 'NotifyDEMO',
      status: result.success ? 'DELIVERED' : 'FAILED',
      gatewayResponse: result.message || JSON.stringify(result.data || ''),
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Registration Welcome SMS dispatched to ${phoneNo}`,
        compiledText,
        data: result.data,
      });
    } else {
      res.status(400).json({ error: result.message, ...result });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch registration SMS' });
  }
});

// ==========================================
// SMS BALANCE & SMS LOGS ROUTES
// ==========================================

router.get('/sms/balance', async (req, res) => {
  try {
    const queryUserId = (req.query.userId as string)?.trim();
    const queryApiKey = (req.query.apiKey as string)?.trim();

    let userId = queryUserId;
    let apiKey = queryApiKey;

    if (!userId || !apiKey) {
      const smsSettings = await db.getSmsSettings();
      userId = userId || (smsSettings.userId || '').trim();
      apiKey = apiKey || (smsSettings.apiKey || '').trim();
    }

    if (!userId || !apiKey) {
      return res.status(400).json({
        success: false,
        balance: 0,
        active: false,
        error: 'Notify.lk User ID and API Key are required to check balance.',
      });
    }

    const balanceRes = await getNotifyLkBalance({ userId, apiKey });
    res.json(balanceRes);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      balance: 0,
      active: false,
      error: error.message || 'Failed to fetch Notify.lk balance',
    });
  }
});

router.get('/sms/logs', async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 250;

    const logs = await db.getSmsLogs({ type, status, search, limit });
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch SMS logs' });
  }
});

router.delete('/sms/logs', async (_req, res) => {
  try {
    await db.clearSmsLogs();
    res.json({ success: true, message: 'All SMS logs cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear SMS logs' });
  }
});

router.get('/settings/:key', async (req, res) => {
  try {
    const value = await db.getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Setting key and value are required' });
    }

    await db.setSetting(key, String(value));
    res.json({ key, value, message: 'Setting saved to database' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 8. DEDICATED PACKAGES & CUSTOMER PACKAGES ROUTES
// ==========================================
router.get('/packages', async (_req, res) => {
  try {
    const packages = await db.getCablePackages();
    res.json({ packages });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch packages' });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const pkg = await db.upsertCablePackage(req.body);
    res.json({ package: pkg, message: 'Package saved to packages table' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save package' });
  }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    const success = await db.deleteCablePackage(req.params.id);
    res.json({ success, message: 'Package deleted from packages table' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete package' });
  }
});

router.get('/customer-packages', async (_req, res) => {
  try {
    const assignments = await db.getCustomerPackages();
    res.json({ assignments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer packages' });
  }
});

router.post('/customer-packages', async (req, res) => {
  try {
    const { identifier, assignment } = req.body;
    if (!identifier || !assignment) {
      return res.status(400).json({ error: 'identifier and assignment are required' });
    }
    await db.setCustomerPackage(identifier, assignment);
    res.json({ success: true, message: 'Customer package saved to customer_packages table' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save customer package' });
  }
});

