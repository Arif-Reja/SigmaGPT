import "./WelcomePage.css";
import SigmaMark from "./SigmaMark.jsx";
import CreatorSection from "./CreatorSection.jsx";

const modes = [
    {
        icon: "🧠",
        name: "Learn",
        description:
            "Clear, beginner-friendly explanations that start with intuition and build up step by step."
    },
    {
        icon: "🧪",
        name: "Practice",
        description:
            "Solve problems with progressive hints instead of instant answers, so the learning sticks."
    },
    {
        icon: "🎤",
        name: "Interview",
        description:
            "A mock technical interviewer that asks one question at a time and gives you feedback."
    },
    {
        icon: "💻",
        name: "Developer",
        description:
            "Build, debug and review code with practical fixes and clear explanations."
    }
];

const features = [
    {
        icon: "fa-solid fa-bolt",
        title: "Live streaming replies",
        text: "Answers appear word by word as they are written, and you can stop them any time."
    },
    {
        icon: "fa-solid fa-lightbulb",
        title: "Socratic mode",
        text: "Turn it on and SigmaGPT guides you with questions, so you discover the answer yourself."
    },
    {
        icon: "fa-solid fa-folder-open",
        title: "Organised chats",
        text: "Search, pin and rename your conversations. Everything is saved to your account."
    },
    {
        icon: "fa-solid fa-code",
        title: "Made for code",
        text: "Syntax-highlighted code blocks with a one-click copy button."
    },
    {
        icon: "fa-solid fa-rotate-right",
        title: "Regenerate and continue",
        text: "Not happy with an answer? Regenerate it, or continue a reply that was cut off."
    },
    {
        icon: "fa-solid fa-lock",
        title: "Private by account",
        text: "Your chats belong to you. Nobody else can open them."
    },
        {
        icon: "fa-solid fa-paperclip",
        title: "Attach images and files",
        text: "Share photos, PDFs, Word documents and code files, then ask questions about them."
    },
    {
        icon: "fa-solid fa-microphone",
        title: "Talk to your tutor",
        text: "Speak your questions and hear the answers read back, in English, Hindi or Bengali."
    },
    {
        icon: "fa-solid fa-volume-high",
        title: "Read replies aloud",
        text: "Listen to any answer with one click while you work on something else."
    },
        {
        icon: "fa-solid fa-play",
        title: "Run code in the chat",
        text: "Press Run on any Java, Python or JavaScript example and see the output instantly, no setup needed."
    },
        {
        icon: "fa-solid fa-clipboard-check",
        title: "Mock interview scorecards",
        text: "Finish an interview and get scores for correctness, communication and depth, plus what to study next. Track your progress over time."
    },
        {
        icon: "fa-solid fa-user-tie",
        title: "Interviews built from your resume",
        text: "Upload your resume and a job description. The interviewer asks about your own projects and gives you resume feedback."
    },
        {
        icon: "fa-solid fa-chart-simple",
        title: "Watch algorithms run",
        text: "See sorting and searching algorithms animate step by step, with the Java code highlighted line by line."
    },
        {
        icon: "fa-solid fa-diagram-project",
        title: "A full DSA course",
        text: "Eight topics with animations, runnable Java code, practice problems and quizzes. Track your progress as you go."
    }
];

function WelcomePage({ onLogin, onSignUp }) {
    return (
        <div className="welcomePage">
            <div className="welcomeInner">
                {/* ===== Top bar ===== */}
                <header className="welcomeNav">
                    <div className="welcomeBrand">
                        <SigmaMark size={34} />
                        <span>SigmaGPT</span>
                    </div>

                    <div className="welcomeNavActions">
                        <button
                            type="button"
                            className="wBtn ghost"
                            onClick={onLogin}
                        >
                            Log in
                        </button>

                        <button
                            type="button"
                            className="wBtn primary"
                            onClick={onSignUp}
                        >
                            Sign up
                        </button>
                    </div>
                </header>

                <main>
                    {/* ===== Hero ===== */}
                    <section className="hero">
                        <div className="heroText">
                            <span className="heroBadge">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                Your AI tutor for coding &amp; interviews
                            </span>

                            <h1>
                                Learn to code. Practice.{" "}
                                <span className="gradientText">
                                    Ace the interview.
                                </span>
                            </h1>

                            <p className="heroLead">
                                SigmaGPT is an AI study partner with four
                                focused modes. It explains concepts, coaches
                                you through problems, runs mock interviews and
                                helps you debug your code.
                            </p>

                            <div className="heroActions">
                                <button
                                    type="button"
                                    className="wBtn primary large"
                                    onClick={onSignUp}
                                >
                                    Get started
                                    <i className="fa-solid fa-arrow-right"></i>
                                </button>

                                <button
                                    type="button"
                                    className="wBtn ghost large"
                                    onClick={onLogin}
                                >
                                    I already have an account
                                </button>
                            </div>

                            <p className="heroNote">
                                Create your account in under a minute.
                            </p>
                        </div>

                        {/* Example conversation (decorative) */}
                        <div className="heroPreview" aria-hidden="true">
                            <div className="previewWindow">
                                <div className="previewBar">
                                    <span className="dot red"></span>
                                    <span className="dot yellow"></span>
                                    <span className="dot green"></span>
                                    <span className="previewTitle">
                                        SigmaGPT · Learn mode
                                    </span>
                                </div>

                                <div className="previewBody">
                                    <div className="previewUser">
                                        What is binary search?
                                    </div>

                                    <div className="previewReply">
                                        <p>
                                            Binary search finds a value in a{" "}
                                            <strong>sorted</strong> array by
                                            cutting the search range in half
                                            at every step.
                                        </p>

                                        <div className="previewCode">
                                            <div className="codeLine">
                                                <span className="tokKey">while</span>{" "}
                                                (low &lt;= high) {"{"}
                                            </div>
                                            <div className="codeLine indent">
                                                <span className="tokKey">int</span>{" "}
                                                mid = low + (high - low) /{" "}
                                                <span className="tokNum">2</span>;
                                            </div>
                                            <div className="codeLine indent">
                                                <span className="tokKey">if</span>{" "}
                                                (arr[mid] == target){" "}
                                                <span className="tokKey">return</span>{" "}
                                                mid;
                                            </div>
                                            <div className="codeLine indent">
                                                <span className="tokKey">if</span>{" "}
                                                (arr[mid] &lt; target) low =
                                                mid +{" "}
                                                <span className="tokNum">1</span>;
                                            </div>
                                            <div className="codeLine indent">
                                                <span className="tokKey">else</span>{" "}
                                                high = mid -{" "}
                                                <span className="tokNum">1</span>;
                                            </div>
                                            <div className="codeLine">{"}"}</div>
                                        </div>

                                        <p>
                                            Each step halves the range, so the
                                            time complexity is{" "}
                                            <code>O(log n)</code>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ===== Modes ===== */}
                    <section className="welcomeSection">
                        <div className="sectionHead">
                            <h2>Four modes, one assistant</h2>
                            <p>
                                Pick the mode that matches what you are doing
                                right now.
                            </p>
                        </div>

                        <div className="modeGrid">
                            {modes.map((item) => (
                                <article className="modeBox" key={item.name}>
                                    <span className="modeBoxIcon">
                                        {item.icon}
                                    </span>
                                    <h3>{item.name}</h3>
                                    <p>{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    {/* ===== Features ===== */}
                    <section className="welcomeSection">
                        <div className="sectionHead">
                            <h2>Everything you need to study smarter</h2>
                            <p>Simple, fast and built around how you learn.</p>
                        </div>

                        <div className="featureGrid">
                            {features.map((item) => (
                                <article
                                    className="featureBox"
                                    key={item.title}
                                >
                                    <span className="featureIcon">
                                        <i className={item.icon}></i>
                                    </span>
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    {/* ===== Creator ===== */}
                    <CreatorSection />

                    {/* ===== Final call to action ===== */}
                    <section className="welcomeSection">
                        <div className="ctaCard">
                            <h2>Ready to start learning?</h2>
                            <p>
                                Create a free account and open your first chat
                                in seconds.
                            </p>

                            <div className="heroActions center">
                                <button
                                    type="button"
                                    className="wBtn primary large"
                                    onClick={onSignUp}
                                >
                                    Create an account
                                </button>

                                <button
                                    type="button"
                                    className="wBtn ghost large"
                                    onClick={onLogin}
                                >
                                    Log in
                                </button>
                            </div>
                        </div>
                    </section>
                </main>

                {/* ===== Footer ===== */}
                <footer className="welcomeFooter">
                    <span>By Arif Reja &hearts;</span>
                    <span>SigmaGPT can make mistakes. Check important info.</span>
                </footer>
            </div>
        </div>
    );
}

export default WelcomePage;