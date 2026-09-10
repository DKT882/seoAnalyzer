# Keyword Scoring Algorithm Specification

## 1. Overview
The SEO Keyword Extraction & Scoring Engine calculates an objective, transparent keyword score between **0 and 100** for every candidate term (1-gram, 2-gram, 3-gram, and long-tail phrases).

## 2. Mathematical Model

For any candidate phrase $k$:

$$\text{KeywordScore}(k) = \min\left(100, \max\left(0, S_{\text{freq}}(k) + S_{\text{prominence}}(k) + \sum_{l \in \text{Locations}} W_l(k) - P_{\text{stuffing}}(k)\right)\right)$$

### 2.1 Component Formulations

#### Frequency & TF-IDF ($S_{\text{freq}}$) — Max 25 points
$$S_{\text{freq}}(k) = \min\left(25, 6 \times \ln(1 + \text{freq}(k)) \times (1 + \text{TF-IDF}(k))\right)$$

#### Positional Prominence ($S_{\text{prominence}}$) — Max 15 points
Rewards words appearing early in the document flow (first 100–200 words):
$$S_{\text{prominence}}(k) = 15 \times \left(1 - \frac{\min(\text{first\_position}(k), 1000)}{1000}\right)$$

#### Location Weights ($\sum W_l$) — Max 55 points
- **Title Tag ($W_{\text{title}}$)**: $+25$ points
- **H1 Heading ($W_{\text{h1}}$)**: $+20$ points
- **URL Slug ($W_{\text{url}}$)**: $+15$ points
- **Meta Description ($W_{\text{meta}}$)**: $+10$ points
- **H2–H6 Subheadings ($W_{\text{subhead}}$)**: $+10$ points
- **Anchor Text ($W_{\text{anchor}}$)**: $+5$ points
- **Image ALT Text ($W_{\text{alt}}$)**: $+5$ points
- **Body Text ($W_{\text{body}}$)**: $+10$ points

#### Density Guardrail Penalty ($P_{\text{stuffing}}$)
Keyword density is:
$$\text{Density}(k) = \frac{\text{freq}(k) \times \text{words\_in\_phrase}(k)}{\text{TotalWordCount}} \times 100\%$$

- Ideal range: $1.0\% \le \text{Density} \le 3.5\%$ (No penalty)
- Under-optimized ($<0.5\%$): Neutral
- Over-optimized / Keyword Stuffing ($>5.0\%$):
  $$P_{\text{stuffing}}(k) = (\text{Density}(k) - 5.0) \times 10$$
