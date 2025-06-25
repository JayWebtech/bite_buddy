// Meal Analysis Utility for Bite Buddy
// Connects to MCP server for nutrition analysis

import Constants from 'expo-constants';

export interface NutritionAnalysis {
  foodName: string;
  energyValue: number;    // 1-100
  hungerValue: number;    // 1-100  
  happinessValue: number; // 1-100
  healthScore: number;    // 1-100
  description: string;
  confidence: number;     // 0-1
  isRealFood?: boolean;   // NEW: validation flag
  validationFlags?: {     // NEW: detailed validation
    hasNaturalLighting: boolean;
    has3DDepth: boolean;
    hasNaturalTextures: boolean;
    noScreenGlare: boolean;
    noPixelation: boolean;
  };
  validationReason?: string; // NEW: reason if not real food
}

export interface MealData {
  energy_value: number;
  hunger_value: number;
  happiness_value: number;
  timestamp: number;
}

const MCP_SERVER_URL = 'http://localhost:3001'; // Your MCP server URL
const BACKEND_URL = 'http://localhost:3000';    // Your backend URL

class MealAnalyzer {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.MCP_PRIVATE_KEY || '';
    if (!this.apiKey) {
      throw new Error('MCP_PRIVATE_KEY not found in environment variables');
    }
  }

  /**
   * Analyze food image and return nutritional values for pet feeding
   */
  async analyzeFoodImage(imageBase64: string): Promise<NutritionAnalysis> {
    try {
      const prompt = this.createAnalysisPrompt();
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const analysis = this.parseAnalysisResponse(data.content[0].text);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing food:', error);
      // Return default values on error
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Create the analysis prompt for Claude
   */
  private createAnalysisPrompt(): string {
    return `Analyze this food image for a virtual pet feeding game. IMPORTANT: Validate that this is a real, fresh food item and not a photo/screen/printed image.

Provide analysis in the following JSON format:

{
  "foodName": "detected food name",
  "energyValue": 0-100,
  "hungerValue": 0-100, 
  "happinessValue": 0-100,
  "healthScore": 0-100,
  "description": "brief description",
  "confidence": 0.0-1.0,
  "isRealFood": true/false,
  "validationFlags": {
    "hasNaturalLighting": true/false,
    "has3DDepth": true/false,
    "hasNaturalTextures": true/false,
    "noScreenGlare": true/false,
    "noPixelation": true/false
  },
  "validationReason": "explanation if not real food"
}

VALIDATION CRITERIA:
- isRealFood: Must be actual physical food, not a photo/screen/print
- hasNaturalLighting: Real lighting with shadows and highlights
- has3DDepth: Visible depth, not flat like a screen/photo
- hasNaturalTextures: Food textures look natural, not pixelated
- noScreenGlare: No screen reflection or digital artifacts
- noPixelation: No visible pixels or digital compression

REJECT if:
- Image shows a phone/tablet screen displaying food
- Appears to be a printed photo or poster
- Has visible pixels, screen glare, or digital artifacts
- Looks artificially flat or lacks natural depth
- Shows obvious digital compression artifacts

Scoring Guidelines:
- energyValue: How much energy this food provides (high carbs/sugars = high energy)
- hungerValue: How filling/satisfying this food is (protein/fiber = high satiation)
- happinessValue: How much joy/pleasure this food brings (treats/desserts = high happiness)
- healthScore: Overall nutritional value (vegetables/fruits = high health)
- confidence: Your confidence in correctly identifying the food (reduce if validation fails)

Consider:
- Fresh fruits/vegetables: High health, moderate happiness
- Junk food: High happiness, low health, high energy
- Protein sources: High hunger value, moderate energy
- Sweets: High energy, high happiness, low health
- Healthy meals: Balanced across all metrics

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Parse Claude's response and extract nutrition data
   */
  private parseAnalysisResponse(responseText: string): NutritionAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize values
      return {
        foodName: parsed.foodName || 'Unknown Food',
        energyValue: Math.max(1, Math.min(100, parsed.energyValue || 50)),
        hungerValue: Math.max(1, Math.min(100, parsed.hungerValue || 50)),
        happinessValue: Math.max(1, Math.min(100, parsed.happinessValue || 50)),
        healthScore: Math.max(1, Math.min(100, parsed.healthScore || 50)),
        description: parsed.description || 'Food analysis',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        isRealFood: parsed.isRealFood,
        validationFlags: parsed.validationFlags,
        validationReason: parsed.validationReason
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Convert nutrition analysis to contract-compatible MealData
   */
  convertToMealData(analysis: NutritionAnalysis): MealData {
    return {
      energy_value: analysis.energyValue,
      hunger_value: analysis.hungerValue,
      happiness_value: analysis.happinessValue,
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Analyze food from camera and return meal data ready for contract
   */
  async analyzeMealForContract(imageBase64: string): Promise<{
    analysis: NutritionAnalysis;
    mealData: MealData;
  }> {
    const analysis = await this.analyzeFoodImage(imageBase64);
    const mealData = this.convertToMealData(analysis);
    
    return { analysis, mealData };
  }

  /**
   * Default analysis for error cases
   */
  private getDefaultAnalysis(): NutritionAnalysis {
    return {
      foodName: 'Unknown Food',
      energyValue: 30,
      hungerValue: 40,
      happinessValue: 35,
      healthScore: 50,
      description: 'Could not analyze food properly',
      confidence: 0.1,
      isRealFood: false,
      validationReason: 'Analysis failed - could not determine if this is real food'
    };
  }

  /**
   * Validate image quality and detect if it's real food
   */
  validateFoodImage(analysis: NutritionAnalysis): {
    isValid: boolean;
    reason: string;
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // Check if it's marked as real food
    if (analysis.isRealFood === false) {
      return {
        isValid: false,
        reason: analysis.validationReason || 'This appears to be a photo or screen, not real food',
        suggestions: [
          'Point your camera at actual, physical food',
          'Avoid scanning photos, screens, or printed images',
          'Make sure the food is well-lit and clearly visible'
        ]
      };
    }

    // Check confidence threshold
    if (analysis.confidence < 0.3) {
      suggestions.push('Take a clearer photo');
      suggestions.push('Improve lighting conditions');
      suggestions.push('Get closer to the food item');
      
      return {
        isValid: false,
        reason: 'Food identification confidence too low',
        suggestions
      };
    }

    // Check validation flags if available
    if (analysis.validationFlags) {
      const flags = analysis.validationFlags;
      
      if (!flags.hasNaturalLighting) {
        suggestions.push('Improve lighting - use natural light if possible');
      }
      
      if (!flags.has3DDepth) {
        suggestions.push('Make sure you\'re scanning real 3D food, not a flat image');
      }
      
      if (!flags.hasNaturalTextures) {
        suggestions.push('Food textures appear artificial - scan real food only');
      }
      
      if (!flags.noScreenGlare) {
        suggestions.push('Avoid scanning screens or photos with glare');
      }
      
      if (!flags.noPixelation) {
        suggestions.push('Image appears digitized - scan physical food only');
      }

      // If multiple validation flags failed, it's likely not real food
      const failedFlags = Object.values(flags).filter(flag => !flag).length;
      if (failedFlags >= 3) {
        return {
          isValid: false,
          reason: 'Multiple validation checks failed - likely not real food',
          suggestions: [
            'Scan actual physical food items only',
            'Avoid photos, screens, or printed images',
            ...suggestions
          ]
        };
      }
    }

    return {
      isValid: true,
      reason: 'Food validation passed',
      suggestions: []
    };
  }

  /**
   * Get meal recommendations based on current pet stats
   */
  getMealRecommendations(currentStats: { hunger: number; happiness: number; energy: number }) {
    const recommendations = [];

    if (currentStats.hunger < 30) {
      recommendations.push('Your pet needs filling foods like proteins or grains');
    }
    if (currentStats.happiness < 30) {
      recommendations.push('Your pet would enjoy some treats or sweet foods');
      }
    if (currentStats.energy < 30) {
      recommendations.push('Your pet needs energizing foods like fruits or carbohydrates');
    }

    return recommendations.length > 0 ? recommendations : ['Your pet is doing well! Any healthy food will be great.'];
  }
}

// Export singleton instance
export const mealAnalyzer = new MealAnalyzer();

// Utility functions for UI
export const getNutritionGrade = (analysis: NutritionAnalysis): string => {
  const average = (analysis.energyValue + analysis.hungerValue + analysis.happinessValue) / 3;
  
  if (average >= 90) return 'S';
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 60) return 'C';
  if (average >= 50) return 'D';
  return 'F';
};

export const getNutritionColor = (analysis: NutritionAnalysis): string => {
  const grade = getNutritionGrade(analysis);
  
  switch (grade) {
    case 'S': return '#00ff00'; // Bright green
    case 'A': return '#7fff00'; // Green
    case 'B': return '#ffff00'; // Yellow
    case 'C': return '#ffa500'; // Orange
    case 'D': return '#ff6347'; // Red-orange
    case 'F': return '#ff0000'; // Red
    default: return '#808080'; // Gray
  }
};

export const getEnergyDescription = (energy: number): string => {
  if (energy >= 80) return 'High Energy';
  if (energy >= 60) return 'Good Energy';
  if (energy >= 40) return 'Moderate Energy';
  if (energy >= 20) return 'Low Energy';
  return 'Very Low Energy';
};

export const getHungerDescription = (hunger: number): string => {
  if (hunger >= 80) return 'Very Filling';
  if (hunger >= 60) return 'Filling';
  if (hunger >= 40) return 'Somewhat Filling';
  if (hunger >= 20) return 'Light';
  return 'Not Filling';
};

export const getHappinessDescription = (happiness: number): string => {
  if (happiness >= 80) return 'Delicious!';
  if (happiness >= 60) return 'Tasty';
  if (happiness >= 40) return 'Decent';
  if (happiness >= 20) return 'Bland';
  return 'Unappetizing';
}; 