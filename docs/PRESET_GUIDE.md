# Auto-Selection Preset Guide

This document explains how to create and customize auto-selection presets for the Test Generator.

## What is a Preset?

A preset defines the rules for automatically selecting questions from the database. It controls:
- **Table distribution**: Which exam tables to pull questions from (JEE, NEET, BITS)
- **Class distribution**: How many questions from each class level (class 2, class 1, null)
- **Global rules**: Frequency prioritization, frequency increment on selection

## Preset File Structure

Presets are JSON files with the following structure:

```json
{
  "id": "unique-preset-id",
  "name": "Display Name",
  "description": "Human-readable description",
  
  "Physics": { ... },
  "Chemistry": { ... },
  "Mathematics": { ... },
  
  "globalRules": { ... }
}
```

---

## Required Fields

### 1. Metadata

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, hyphens allowed) |
| `name` | string | Display name shown in dropdown |
| `description` | string | Brief description of the preset |

### 2. Subject Configuration

Each subject (Physics, Chemistry, Mathematics) contains two division configurations:

```json
"Physics": {
  "div1": { ... },   // MCQ questions (answer is A, B, C, or D)
  "div2": { ... }    // Integer questions (numeric answer)
}
```

### 3. Division Configuration

Each division has:

#### Table Distribution
Percentages of questions to pull from each exam table (must sum to 100):

```json
"tableDistribution": {
  "jee": 70,    // 70% from JEE questions
  "neet": 20,   // 20% from NEET questions
  "bits": 10    // 10% from BITS questions
}
```

#### Class Distribution
Number of questions per class level:

```json
"classDistribution": {
  "class2": 1,      // 1 question from class=2 (hardest)
  "class1": 7,      // 7 questions from class=1 (medium)
  "classNull": 12   // 12 questions from class=NULL (varied)
}
```

> **Note**: The sum of classDistribution values should match the expected section question count, but the algorithm will fill remaining slots automatically.

### 4. Global Rules

```json
"globalRules": {
  "prioritizeLowFrequency": true,    // Select least-used questions first
  "incrementFrequencyOnSelect": true  // Update frequency after selection
}
```

---

## Complete Example

```json
{
  "id": "jee-standard",
  "name": "JEE",
  "description": "Standard JEE exam selection preset",
  
  "Physics": {
    "div1": {
      "tableDistribution": { "jee": 70, "neet": 20, "bits": 10 },
      "classDistribution": { "class2": 1, "class1": 7, "classNull": 12 }
    },
    "div2": {
      "tableDistribution": { "jee": 100, "neet": 0, "bits": 0 },
      "classDistribution": { "class2": 0, "class1": 0, "classNull": 5 }
    }
  },
  
  "Chemistry": {
    "div1": {
      "tableDistribution": { "jee": 70, "neet": 20, "bits": 10 },
      "classDistribution": { "class2": 1, "class1": 7, "classNull": 12 }
    },
    "div2": {
      "tableDistribution": { "jee": 100, "neet": 0, "bits": 0 },
      "classDistribution": { "class2": 0, "class1": 0, "classNull": 5 }
    }
  },
  
  "Mathematics": {
    "div1": {
      "tableDistribution": { "jee": 70, "neet": 20, "bits": 10 },
      "classDistribution": { "class2": 1, "class1": 7, "classNull": 12 }
    },
    "div2": {
      "tableDistribution": { "jee": 100, "neet": 0, "bits": 0 },
      "classDistribution": { "class2": 0, "class1": 0, "classNull": 5 }
    }
  },
  
  "globalRules": {
    "prioritizeLowFrequency": true,
    "incrementFrequencyOnSelect": true
  }
}
```

---

## How Selection Works

1. **Per Chapter**: The algorithm iterates through each chapter in the section's weightage
2. **Division Filter**: 
   - Div 1: Only questions with `answer` IN ('A', 'B', 'C', 'D')
   - Div 2: Only questions with numeric `answer` (NOT A, B, C, D)
3. **Table Priority**: Tries JEE first, then NEET, then BITS
4. **Frequency**: If `prioritizeLowFrequency` is true, selects least-used questions first
5. **Chapter Limits**: Respects the per-chapter limits from the test's weightage configuration

---

## Creating Custom Presets

### Step 1: Copy an Existing Preset
Start by copying `jee-preset.json` as a template.

### Step 2: Customize Values
- Adjust table distributions based on your exam focus
- Modify class distributions based on difficulty requirements
- Change global rules as needed

### Step 3: Save with Unique ID
- Save to `src/data/presets/` directory
- Use a unique `id` field
- Filename should match the id (e.g., `neet-preset.json`)

### Step 4: Import into Application
- Open the Test Generator
- Go to **Auto Select** > **Manage Presets** (⚙️ icon)
- Click **Import** and select your JSON file
- The preset is automatically copied to the application's storage and will be available every time you start the app.


---

## Tips

1. **Table Distribution**: 
   - Use `100/0/0` for JEE-only if NEET/BITS tables don't have relevant content
   - Use `70/20/10` for a balanced mix

2. **Class Distribution**:
   - Class 2 = Most difficult questions
   - Class 1 = Medium difficulty
   - Class NULL = Standard/varied difficulty

3. **Division 2 (Integer)**:
   - NEET/BITS tables may not have integer questions
   - Set their distribution to 0 for Div 2

4. **Validation**:
   - Table distributions must sum to 100
   - All three subjects should be configured
   - Global rules are optional but recommended
