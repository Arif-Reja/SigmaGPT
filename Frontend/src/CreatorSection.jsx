import "./CreatorSection.css";
import { useState } from "react";
const creator = {
    name: "Arif Reja",
       role: "Full Stack Developer , Java Developer And Coder",
    bio: "I'm a Full Stack and Java developer who enjoys turning ideas into real products. SigmaGPT is my own AI study partner, built end to end with a React frontend, a Node and Express backend, and MongoDB for storage. It streams answers live as they are written, and it has four learning modes (Learn, Practice, Interview and Developer) plus a Socratic mode that teaches by asking you questions. Every account is private, with securely hashed passwords and token-based login, and your chats are saved so you can search, pin and rename them any time.",

    photo: "/creator.jpg",

    links: [
        { label: "GitHub", icon: "fa-brands fa-github", url: "" },
        { label: "LinkedIn", icon: "fa-brands fa-linkedin-in", url: "" },
        { label: "Email", icon: "fa-solid fa-envelope", url: "" }
    ]
};

const techStack = [
    "React",
    "Vite",
    "Node.js",
    "Express",
    "MongoDB",
    "OpenRouter"
];
const getInitials = (name) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

function CreatorSection() {
    const [photoFailed, setPhotoFailed] = useState(false);

    const visibleLinks = creator.links.filter((link) => link.url.trim());

    return (
        <section className="welcomeSection" id="creator">
            <div className="sectionHead">
                <h2>Meet the creator</h2>
                <p>The person behind SigmaGPT.</p>
            </div>

            <div className="creatorCard">
                <div className="creatorPhotoWrap">
                    {photoFailed ? (
                        <div className="creatorInitials" aria-hidden="true">
                            {getInitials(creator.name)}
                        </div>
                    ) : (
                        <img
                            src={creator.photo}
                            alt={`${creator.name}, creator of SigmaGPT`}
                            className="creatorPhoto"
                            onError={() => setPhotoFailed(true)}
                        />
                    )}
                </div>

                <div className="creatorInfo">
                    <span className="creatorLabel">Created by</span>

                    <h3>{creator.name}</h3>

                    <p className="creatorRole">{creator.role}</p>

                    <p className="creatorBio">{creator.bio}</p>

                    <ul className="creatorStack" aria-label="Built with">
                        {techStack.map((tech) => (
                            <li key={tech}>{tech}</li>
                        ))}
                    </ul>

                    {visibleLinks.length > 0 && (
                        <div className="creatorLinks">
                            {visibleLinks.map((link) => {
                                const isEmail = link.url.startsWith("mailto:");

                                return (
                                    <a
                                        key={link.label}
                                        className="creatorLink"
                                        href={link.url}
                                        target={isEmail ? undefined : "_blank"}
                                        rel={
                                            isEmail
                                                ? undefined
                                                : "noopener noreferrer"
                                        }
                                    >
                                        <i className={link.icon}></i>
                                        {link.label}
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default CreatorSection;