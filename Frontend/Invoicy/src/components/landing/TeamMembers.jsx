import { TEAM_MEMBERS } from "../../utils/data";

const TeamMembers = () => {   
    return (
        <section id="TeamMembers" className="py-20 lg:py-28 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                        Meet the Team
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        The talented individuals behind Invoicy who are dedicated to making your invoicing experience seamless.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {TEAM_MEMBERS.map((member, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center border border-gray-100">
                            <img
                                src={member.photo}
                                alt={member.name}
                                className="w-32 h-32 mx-auto rounded-full mb-6 object-cover border-4 border-gray-100"
                            />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                            <p className="text-blue-900 font-medium mb-3">{member.role}</p>
                            <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default TeamMembers;