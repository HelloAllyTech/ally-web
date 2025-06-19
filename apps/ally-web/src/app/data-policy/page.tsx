export default function DataPolicy() {
  return (
    <main className="min-h-screen bg-[#FFFCF8]">
      {/* Hero Section */}
      <div className="bg-[#3730A3] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-['IBM_Plex_Serif'] mb-6">Our Data Policy</h1>
          <p className="text-2xl opacity-90">100% transparent</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-6xl font-['IBM_Plex_Serif'] mb-12">Overview</h2>
        
        <div className="space-y-8 text-xl leading-relaxed font-['IBM_Plex_Serif']">
          <p>
            1. We do not keep and use recordings of calls between clients and mental health workers
          </p>
          
          <p>
            2. Our ASR (Automatic Speech Recognition) technology listens to a conversation to extract 
            insights without saving a recording of the conversation for future use
          </p>
          
          <p>
            3. We do not trick our users in to giving consent to use their data, if we need any data, we will 
            request for your permission in very clear and unmissable words, with the option for you to refuse
          </p>
          
          <p>
            4. We do not collect any data to monetise it, we are a not for profit organisation that is 
            supported by philanthropy capital
          </p>
          
          <p>
            5. We do not share data with other organisations in exchange of donations/funds
          </p>
          
          <p>
            6. We follow data security best practices, including, but not limited only to minimum legal 
            requirements
          </p>
        </div>
      </div>
    </main>
  );
}