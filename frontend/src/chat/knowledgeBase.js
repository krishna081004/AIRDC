export const knowledgeBase = {
  pneumonia: {
    greeting: "The analysis suggests a high probability of Pneumonia. I can provide some general information, but you must consult a doctor for a real diagnosis.",
    questions: [
      { question: "What is Pneumonia?", answer: "Pneumonia is an infection that inflames the air sacs in one or both lungs. These sacs may fill with fluid, causing a cough, fever, chills, and difficulty breathing." },
      { question: "How is Pneumonia treated?", answer: "Treatment depends on the type. Bacterial pneumonia is treated with antibiotics. A doctor must determine the correct course of action. Rest and hydration are also key." },
      { question: "Is Pneumonia contagious?", answer: "The germs that cause pneumonia are contagious and can be spread through coughing and sneezing. Good hygiene can help prevent its spread." }
    ]
  },
  tuberculosis: {
    greeting: "The analysis suggests a high probability of Tuberculosis. It is very important to see a healthcare provider. Here is some general information.",
    questions: [
      { question: "What is Tuberculosis (TB)?", answer: "Tuberculosis is a serious infectious disease that mainly affects the lungs. It is caused by bacteria and spreads through the air when an infected person coughs." },
      { question: "How is TB cured?", answer: "TB is curable with a specific course of several antibiotic medications for at least six to nine months. It is critical to complete the entire treatment prescribed by a doctor." },
      { question: "What is latent vs. active TB?", answer: "Latent TB means the bacteria are inactive in your body and not contagious. Active TB is when the bacteria are active, making you sick and contagious." }
    ]
  },
  default: {
    greeting: "Hello! Once you get an analysis result, I can provide more information.",
    questions: []
  }
};