/** @param {{questions: string[], onSelect: (question: string) => void}} props */
export default function SuggestedQuestions({ questions, onSelect }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
