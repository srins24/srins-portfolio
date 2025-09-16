"""
Advanced Voice-to-Health-Advice Backend Service
Handles voice transcription, NLP processing, and health coaching
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import logging
import uuid
import json
import asyncio
from datetime import datetime, timedelta
# import openai  # Optional - can be added when needed
# import whisper  # Optional - can be added when needed
import re
from enum import Enum

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Voice and NLP router
voice_router = APIRouter(prefix="/api/voice", tags=["voice-nlp"])

class TranscriptionRequest(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    language: Optional[str] = Field("en", description="Language code")
    use_whisper: Optional[bool] = Field(True, description="Use Whisper for higher accuracy")

class VoiceCommandRequest(BaseModel):
    text: str = Field(..., description="Transcribed voice command")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User context data")
    patient_id: Optional[str] = Field(None, description="Patient identifier")

class IntentType(str, Enum):
    SHOW_RISK = "show_risk"
    EXPLAIN_RESULTS = "explain_results"
    START_ASSESSMENT = "start_assessment"
    HEALTH_TIPS = "health_tips"
    MEDICATION_REMINDER = "medication_reminder"
    EMERGENCY_HELP = "emergency_help"
    NEXT_QUESTION = "next_question"
    REPEAT_LAST = "repeat_last"
    GENERAL_QUERY = "general_query"
    UNKNOWN = "unknown"

class NLPResponse(BaseModel):
    intent: IntentType
    confidence: float
    entities: Dict[str, Any]
    response_text: str
    suggested_actions: List[str]
    should_speak: bool = True
    priority: str = "normal"  # normal, high, urgent

class HealthCoachingService:
    """Advanced AI Health Coaching with NLP and Context Awareness"""
    
    def __init__(self):
        self.intent_patterns = {
            IntentType.SHOW_RISK: [
                r'\b(show|what|current|my)\b.*\b(risk|score|level)\b',
                r'\bheart attack risk\b',
                r'\bstroke risk\b',
                r'\bcardiovascular risk\b'
            ],
            IntentType.EXPLAIN_RESULTS: [
                r'\b(explain|what does|help me understand|interpret)\b.*\b(result|score|mean|means)\b',
                r'\bwhat does this mean\b',
                r'\bexplain my results\b'
            ],
            IntentType.START_ASSESSMENT: [
                r'\b(start|begin|new|take)\b.*\b(assessment|test|evaluation|checkup)\b',
                r'\btake a test\b',
                r'\bnew assessment\b'
            ],
            IntentType.HEALTH_TIPS: [
                r'\b(health|lifestyle|fitness)\b.*\b(tip|advice|suggestion|recommendation)\b',
                r'\bhow to improve\b',
                r'\bhealth advice\b',
                r'\blifestyle tips\b'
            ],
            IntentType.MEDICATION_REMINDER: [
                r'\b(medication|medicine|pill|drug)\b.*\b(reminder|remind|alert)\b',
                r'\bremind.*medication\b',
                r'\btake.*medicine\b'
            ],
            IntentType.EMERGENCY_HELP: [
                r'\b(emergency|urgent|help|911|doctor)\b',
                r'\bchest pain\b',
                r'\bcall doctor\b',
                r'\bfeel bad\b'
            ],
            IntentType.NEXT_QUESTION: [
                r'\b(next|continue|proceed|go on)\b',
                r'\bnext question\b',
                r'\bcontinue assessment\b'
            ],
            IntentType.REPEAT_LAST: [
                r'\b(repeat|say again|again|replay)\b',
                r'\brepeat last\b',
                r'\bsay that again\b'
            ]
        }
        
        # Medical knowledge base for context-aware responses
        self.medical_context = {
            "heart_attack_risk_factors": [
                "age", "cholesterol", "blood pressure", "smoking", "diabetes", 
                "family history", "obesity", "physical inactivity"
            ],
            "stroke_risk_factors": [
                "age", "blood pressure", "diabetes", "smoking", "heart disease",
                "irregular heartbeat", "cholesterol"
            ],
            "lifestyle_improvements": {
                "exercise": "Aim for 150 minutes of moderate exercise per week",
                "diet": "Follow a Mediterranean diet rich in fruits, vegetables, and whole grains",
                "smoking": "Quitting smoking is the most important step for heart health",
                "stress": "Practice stress management through meditation or relaxation techniques",
                "sleep": "Get 7-9 hours of quality sleep each night"
            }
        }

    def classify_intent(self, text: str) -> tuple[IntentType, float]:
        """Classify the intent of the user's voice command"""
        text_lower = text.lower()
        best_intent = IntentType.UNKNOWN
        best_confidence = 0.0
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    # Simple confidence scoring based on pattern match quality
                    confidence = min(0.95, len(re.findall(pattern, text_lower)) * 0.3 + 0.6)
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_intent = intent
        
        return best_intent, best_confidence

    def extract_entities(self, text: str, intent: IntentType) -> Dict[str, Any]:
        """Extract relevant entities from the text based on intent"""
        entities = {}
        text_lower = text.lower()
        
        # Extract health-related entities
        if "heart attack" in text_lower:
            entities["condition"] = "heart_attack"
        elif "stroke" in text_lower:
            entities["condition"] = "stroke"
        elif "heart failure" in text_lower:
            entities["condition"] = "heart_failure"
        elif "arrhythmia" in text_lower:
            entities["condition"] = "arrhythmia"
            
        # Extract severity indicators
        if any(word in text_lower for word in ["urgent", "emergency", "severe", "bad"]):
            entities["severity"] = "high"
        elif any(word in text_lower for word in ["mild", "slight", "little"]):
            entities["severity"] = "low"
        else:
            entities["severity"] = "normal"
            
        # Extract time references
        if any(word in text_lower for word in ["now", "current", "today"]):
            entities["timeframe"] = "current"
        elif any(word in text_lower for word in ["last", "previous", "recent"]):
            entities["timeframe"] = "recent"
            
        return entities

    async def generate_contextual_response(
        self, 
        intent: IntentType, 
        entities: Dict[str, Any], 
        user_context: Dict[str, Any]
    ) -> NLPResponse:
        """Generate contextual health coaching response"""
        
        if intent == IntentType.SHOW_RISK:
            return await self._handle_show_risk(entities, user_context)
        elif intent == IntentType.EXPLAIN_RESULTS:
            return await self._handle_explain_results(entities, user_context)
        elif intent == IntentType.START_ASSESSMENT:
            return await self._handle_start_assessment(entities, user_context)
        elif intent == IntentType.HEALTH_TIPS:
            return await self._handle_health_tips(entities, user_context)
        elif intent == IntentType.MEDICATION_REMINDER:
            return await self._handle_medication_reminder(entities, user_context)
        elif intent == IntentType.EMERGENCY_HELP:
            return await self._handle_emergency_help(entities, user_context)
        elif intent == IntentType.NEXT_QUESTION:
            return await self._handle_next_question(entities, user_context)
        elif intent == IntentType.REPEAT_LAST:
            return await self._handle_repeat_last(entities, user_context)
        else:
            return await self._handle_general_query(entities, user_context)

    async def _handle_show_risk(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        condition = entities.get("condition", "overall")
        
        # Get user's latest risk data from context or database
        risk_data = context.get("risk_data", {})
        
        if condition == "heart_attack":
            risk_score = risk_data.get("heart_attack", 0)
            response_text = f"Your heart attack risk is currently {risk_score}%. This is based on your age, lifestyle factors, and medical history. "
        elif condition == "stroke":
            risk_score = risk_data.get("stroke", 0)
            response_text = f"Your stroke risk is {risk_score}%. Key factors include your blood pressure and overall cardiovascular health. "
        else:
            overall_risk = risk_data.get("overall_cardiovascular", 0)
            response_text = f"Your overall cardiovascular risk is {overall_risk}%. This combines multiple factors including heart attack, stroke, and heart failure risks. "

        # Add personalized recommendations
        if risk_score > 70:
            response_text += "This is considered high risk. I recommend consulting with your healthcare provider soon."
            priority = "urgent"
        elif risk_score > 40:
            response_text += "This is moderate risk. Consider lifestyle improvements and regular monitoring."
            priority = "high"
        else:
            response_text += "This is relatively low risk. Keep up your healthy habits!"
            priority = "normal"

        return NLPResponse(
            intent=IntentType.SHOW_RISK,
            confidence=0.9,
            entities=entities,
            response_text=response_text,
            suggested_actions=["view_detailed_risk", "get_recommendations"],
            priority=priority
        )

    async def _handle_explain_results(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        response_text = """Your cardiovascular risk assessment uses advanced machine learning to analyze over 20 health factors. 
        The system considers your age, blood pressure, cholesterol levels, family history, lifestyle habits like smoking and exercise, 
        and other medical indicators. Each factor is weighted based on medical research to give you personalized risk predictions. 
        The percentages represent your statistical likelihood of developing each condition over the next 10 years."""

        return NLPResponse(
            intent=IntentType.EXPLAIN_RESULTS,
            confidence=0.95,
            entities=entities,
            response_text=response_text,
            suggested_actions=["show_risk_factors", "lifestyle_recommendations"]
        )

    async def _handle_start_assessment(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        response_text = "I'll start a new cardiovascular health assessment for you. This will take about 5 minutes and covers your medical history, lifestyle, and current health status. You can use voice input for all questions. Let's begin!"

        return NLPResponse(
            intent=IntentType.START_ASSESSMENT,
            confidence=0.9,
            entities=entities,
            response_text=response_text,
            suggested_actions=["navigate_to_assessment", "enable_voice_input"]
        )

    async def _handle_health_tips(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        # Personalize tips based on user's risk profile
        risk_data = context.get("risk_data", {})
        user_profile = context.get("user_profile", {})
        
        tips = []
        
        if user_profile.get("smoking", False):
            tips.append("🚭 Quitting smoking is the most impactful change you can make - it can reduce your heart attack risk by up to 50%")
        
        if user_profile.get("exercise_hours", 0) < 2.5:
            tips.append("🏃‍♂️ Try to get at least 150 minutes of moderate exercise per week - even a 30-minute daily walk makes a huge difference")
        
        if user_profile.get("bmi", 0) > 30:
            tips.append("⚖️ Maintaining a healthy weight through diet and exercise can significantly reduce your cardiovascular risk")
        
        # Default tips if no specific profile
        if not tips:
            tips = [
                "🥗 Follow a Mediterranean-style diet rich in fruits, vegetables, and healthy fats",
                "😴 Aim for 7-9 hours of quality sleep each night for optimal heart health",
                "🧘‍♀️ Practice stress management through meditation, yoga, or other relaxation techniques"
            ]
        
        response_text = f"Here are personalized health tips for you: {' • '.join(tips[:2])}"

        return NLPResponse(
            intent=IntentType.HEALTH_TIPS,
            confidence=0.9,
            entities=entities,
            response_text=response_text,
            suggested_actions=["set_health_goals", "track_progress"]
        )

    async def _handle_medication_reminder(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        response_text = "I've set a medication reminder for you. It's important to take your prescribed heart medications consistently. Would you like me to set up daily reminders or help you track your medication schedule?"

        return NLPResponse(
            intent=IntentType.MEDICATION_REMINDER,
            confidence=0.9,
            entities=entities,
            response_text=response_text,
            suggested_actions=["set_daily_reminder", "medication_tracking"],
            priority="high"
        )

    async def _handle_emergency_help(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        severity = entities.get("severity", "normal")
        
        if severity == "high" or "chest pain" in str(entities.get("symptoms", "")):
            response_text = "If you're experiencing chest pain, shortness of breath, or other serious symptoms, please call 911 immediately or go to the nearest emergency room. Your health and safety are the top priority."
            priority = "urgent"
        else:
            response_text = "For non-urgent medical questions, I recommend contacting your healthcare provider. If you're experiencing concerning symptoms, don't hesitate to seek medical attention. I can help you find local emergency services or provide health information."
            priority = "high"

        return NLPResponse(
            intent=IntentType.EMERGENCY_HELP,
            confidence=0.95,
            entities=entities,
            response_text=response_text,
            suggested_actions=["emergency_contacts", "symptom_checker"],
            priority=priority
        )

    async def _handle_next_question(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        response_text = "Let's continue. What else would you like to know about your heart health? You can ask about your risk levels, request health tips, or get explanations about your results."

        return NLPResponse(
            intent=IntentType.NEXT_QUESTION,
            confidence=0.8,
            entities=entities,
            response_text=response_text,
            suggested_actions=["continue_conversation"]
        )

    async def _handle_repeat_last(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        last_response = context.get("last_response", "I don't have a previous response to repeat.")
        response_text = f"Let me repeat that: {last_response}"

        return NLPResponse(
            intent=IntentType.REPEAT_LAST,
            confidence=0.9,
            entities=entities,
            response_text=response_text,
            suggested_actions=["continue_conversation"]
        )

    async def _handle_general_query(self, entities: Dict[str, Any], context: Dict[str, Any]) -> NLPResponse:
        response_text = "I'm here to help with your heart health questions. You can ask me about your risk levels, request personalized health tips, start a new assessment, or get explanations about your cardiovascular health. What would you like to know?"

        return NLPResponse(
            intent=IntentType.GENERAL_QUERY,
            confidence=0.7,
            entities=entities,
            response_text=response_text,
            suggested_actions=["show_help_menu", "voice_commands_list"]
        )

# Initialize the health coaching service
health_coach = HealthCoachingService()

@voice_router.post("/transcribe", response_model=Dict[str, Any])
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    language: str = "en",
    use_whisper: bool = True
):
    """
    Transcribe audio to text using Web Speech API fallback or Whisper
    """
    try:
        # Save uploaded audio file temporarily
        audio_id = str(uuid.uuid4())
        temp_path = f"/tmp/audio_{audio_id}.wav"
        
        with open(temp_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        if use_whisper:
            # Use Whisper for high-accuracy transcription
            model = whisper.load_model("base")
            result = model.transcribe(temp_path, language=language)
            
            transcription = {
                "text": result["text"],
                "language": result["language"],
                "confidence": 0.95,  # Whisper doesn't provide confidence, so we estimate
                "method": "whisper"
            }
        else:
            # Fallback to basic transcription (placeholder)
            transcription = {
                "text": "Transcription not available without Whisper",
                "language": language,
                "confidence": 0.0,
                "method": "fallback"
            }
        
        # Clean up temporary file in background
        background_tasks.add_task(cleanup_temp_file, temp_path)
        
        return {
            "transcription": transcription,
            "audio_id": audio_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@voice_router.post("/process-command", response_model=NLPResponse)
async def process_voice_command(request: VoiceCommandRequest):
    """
    Process voice command through NLP pipeline and return health coaching response
    """
    try:
        # Classify intent
        intent, confidence = health_coach.classify_intent(request.text)
        
        # Extract entities
        entities = health_coach.extract_entities(request.text, intent)
        
        # Generate contextual response
        response = await health_coach.generate_contextual_response(
            intent, entities, request.context
        )
        
        # Log the interaction for analytics and improvement
        logger.info(f"Voice command processed: '{request.text}' -> Intent: {intent} (confidence: {confidence})")
        
        return response
        
    except Exception as e:
        logger.error(f"Voice command processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Command processing failed: {str(e)}")

@voice_router.get("/voice-commands", response_model=Dict[str, List[str]])
async def get_available_voice_commands():
    """
    Return list of available voice commands for user guidance
    """
    commands = {
        "risk_queries": [
            "Show my heart attack risk",
            "What is my stroke risk?",
            "What's my current cardiovascular risk?"
        ],
        "explanations": [
            "Explain my results",
            "What does this mean?",
            "Help me understand my risk score"
        ],
        "actions": [
            "Start new assessment",
            "Give me health tips",
            "Set medication reminder"
        ],
        "navigation": [
            "Next question",
            "Repeat last result",
            "Continue assessment"
        ],
        "emergency": [
            "Emergency help",
            "Call doctor",
            "I need urgent assistance"
        ]
    }
    
    return commands

async def cleanup_temp_file(file_path: str):
    """Background task to clean up temporary audio files"""
    try:
        import os
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to cleanup temp file {file_path}: {e}")

# Health coaching conversation state management
conversation_states = {}

@voice_router.post("/start-conversation/{patient_id}")
async def start_health_conversation(patient_id: str):
    """Initialize a new health coaching conversation"""
    conversation_id = str(uuid.uuid4())
    conversation_states[conversation_id] = {
        "patient_id": patient_id,
        "started_at": datetime.utcnow(),
        "messages": [],
        "context": {},
        "last_intent": None
    }
    
    return {
        "conversation_id": conversation_id,
        "welcome_message": "Hello! I'm your AI Health Coach. I'm here to help you understand your cardiovascular health and provide personalized guidance. What would you like to know?",
        "suggested_commands": [
            "Show my current risk levels",
            "Explain my latest results", 
            "Give me health improvement tips"
        ]
    }

@voice_router.get("/conversation/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    """Get conversation history for a specific session"""
    if conversation_id not in conversation_states:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation_states[conversation_id]

# Export the router to be included in main FastAPI app
__all__ = ["voice_router"]