import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const App = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [inputHeight, setInputHeight] = useState(20); // Track input height
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const backendUrl = 'http://65.0.135.93/';

  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Improved textarea height adjustment - only adjust after line breaks
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to default minimum
      textarea.style.height = '20px';
      
      // Only resize if content actually needs more space (line wrapping or multiple lines)
      const lineBreaks = (question.match(/\n/g) || []).length;
      const needsResize = textarea.scrollHeight > textarea.clientHeight || lineBreaks > 0;
      
      if (needsResize) {
        // Calculate new height with constraints
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 20), 120);
        textarea.style.height = `${newHeight}px`;
        setInputHeight(newHeight);
      } else {
        // Keep at minimum height if no extra space needed
        textarea.style.height = '20px';
        setInputHeight(20);
      }
    }
  }, [question]);

  // Focus on textarea when switching to full screen chat
  useEffect(() => {
    if (isFullScreenChat && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 300);
    }
  }, [isFullScreenChat]);

  // Recalculate chat container height when input height changes
  useEffect(() => {
    if (chatContainerRef.current) {
      updateChatContainerHeight();
    }
  }, [inputHeight, isFullScreenChat]);

  // Update chat container height based on input container height
  const updateChatContainerHeight = () => {
    if (!chatContainerRef.current) return;
    
    const inputContainerHeight = document.querySelector('.chat-input-container')?.offsetHeight || 70;
    const headerHeight = 60; // Approximate header height
    const padding = 20; // Reduced padding for better space utilization
    
    // Calculate proper height considering all elements
    const totalHeight = inputContainerHeight + headerHeight + padding;
    chatContainerRef.current.style.height = `calc(100vh - ${totalHeight}px)`;
  };

  const handleAskQuestion = async (q) => {
    const query = q || question;
    if (!query) {
      setError('Please enter a question');
      return;
    }
    setLoading(true);
    setError(null);

    const newChat = { question: query, response: null };
    setChatHistory([...chatHistory, newChat]);

    try {
      const payload = {
        query: query,
        chat_history: []
      };
      const res = await axios.post(`${backendUrl}query`, payload);
      const updatedChat = { question: query, response: res.data };
      setChatHistory((prev) => [...prev.slice(0, -1), updatedChat]);
      setQuestion('');
      setIsFullScreenChat(true);
      
      // Update chat container height after response is received
      setTimeout(updateChatContainerHeight, 100);
      
      // Additional scroll to bottom to ensure new message is visible
      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    } catch (err) {
      console.error('Error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to get response'
      );
    } finally {
      setLoading(false);
    }
  };

  // Function removed since it's no longer used with header replacement

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const handleTextareaChange = (e) => {
    setQuestion(e.target.value);
  };

  const renderChart = (response) => {
    if (!response || response.graph_needed !== 'yes') return null;
  
    const { graph_type, data } = response;
    
    if (!data || !data.labels || !data.datasets) {
      return <p className="no-data">No valid data available for chart</p>;
    }
  
    const chartData = {
      labels: data.labels || [],
      datasets: [],
    };
  
    const colors = [
      '#4b68a9','#ed5a3f', '#adb981', '#f8b797', '#FFEEAD',
      '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71',
    ];
    const BarChart_colors=[

      '#4b68a9'
    ]
  
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          align: 'center',
          labels: {
            color: '#000',
            font: { size: 12, weight: 'normal' },
            padding: 10,
            boxWidth: 20,
            boxHeight: 10,
            usePointStyle: false,
          },
        },
        title: {
          display: false,
          text: `${graph_type.replace('_', ' ').toUpperCase()} - Analysis`,
          color: '#000',
          font: { size: 14 },
        },
        tooltip: { 
          enabled: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toLocaleString();
              }
              return label;
            }
          }
        },
        datalabels: {
          display: (context) => context.chart.config.type === 'bar',
          anchor: 'end',
          align: 'top',
          formatter: (value) => value.toLocaleString(),
          color: '#000',
          font: { weight: 'bold', size: 12 },
          offset: 5,
        },
      },
      scales: {},
    };
  
    switch (graph_type) {
      case 'line_chart':
        chartData.datasets = [{
          label: data.legend ? data.legend[0] : 'Value Over Time',
          data: data.datasets.map(item => item[0]),
          borderColor: colors[0],
          backgroundColor: `${colors[0]}33`,
          fill: true,
          tension: 0.4,
          pointStyle: 'circle',
        }];
        options.plugins.legend.display = false;
        options.scales = {
          y: {
            beginAtZero: true,
            title: { display: true, text: '', color: '#000', font: { size: 12 } },
            ticks: { 
              color: '#000', 
              font: { size: 10 },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: { display: false },
            afterDataLimits: (scale) => {
              scale.max = scale.max * 1.1;
            }
          },
          x: {
            title: { display: true, text: '', color: '#000', font: { size: 12 } },
            ticks: { color: '#000', font: { size: 10 } },
            grid: { display: false },
          },
        };
        return (
          <div className="line-chart-wrapper">
            <Line data={chartData} options={options} />
          </div>
        );
  
      case 'bar_chart':
        chartData.datasets = [{
          label: data.legend ? data.legend[0] : 'Value',
          data: data.datasets.map(item => item[0]),
          backgroundColor: BarChart_colors.slice(0, data.labels.length),
          borderColor: BarChart_colors.slice(0, data.labels.length),
          borderWidth: 1,
          borderRadius: 4,
        }];
        options.plugins.legend.display = false;
        options.scales = {
          y: {
            beginAtZero: true,
            title: { display: true, text: '', color: '#000', font: { size: 12 } },
            ticks: { 
              color: '#000', 
              font: { size: 10 },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: { display: false },
            afterDataLimits: (scale) => {
              scale.max = scale.max * 1.2;
            }
          },
          x: {
            title: { display: true, text: '', color: '#000', font: { size: 12 } },
            ticks: { color: '#000', font: { size: 10 } },
            grid: { display: false },
          },
        };
        return (
          <div className="bar-chart-wrapper">
            <Bar data={chartData} options={options} />
          </div>
        );
  
      case 'pie_chart':
        chartData.datasets = [{
          label: data.legend ? data.legend[0] : 'Value',
          data: data.datasets.map(item => item[0]),
          backgroundColor: chartData.labels.length <= colors.length
            ? colors.slice(0, chartData.labels.length)
            : [...colors, ...colors.slice(0, chartData.labels.length - colors.length)],
          borderColor: '#fff',
          borderWidth: 1,
        }];
        delete options.scales;
        options.plugins.datalabels = {
          display: true,
          formatter: (value, context) => {
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}%`;
          },
          color: '#fff',
          font: { weight: 'bold', size: 12 },
          anchor: 'center',
          align: 'center',
        };
        
        options.plugins.tooltip = {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw.toLocaleString()} (${percentage}%)`;
            }
          }
        };
        
        return (
          <div className="pie-chart-wrapper">
            <Pie data={chartData} options={options} />
          </div>
        );
  
      default:
        return <p className="no-data">Unsupported graph type: {graph_type}</p>;
    }
  };
  
  // Header component that will be used in both home and chat screens
  const Header = () => (
    <header className="app-header">
      <div className="logo">
        <img src="/Assets/logo.png" alt="People's Leasing Logo" />
      </div>
      <div className="header-icons">
        <div className="chatbot">
          <img src="/Assets/AI_ChatBot.png" alt="AI Chatbot" />
        </div>
      </div>
    </header>
  );

  return (
    <div className="app">
      {!isFullScreenChat && <Header />}

      <main className="app-main">
        {isFullScreenChat ? (
          <div className="full-screen-chat">
            {/* Replaced back button with the header */}
            <Header />
            <div className="chat-container" ref={chatContainerRef}>
              <div className="chat-messages full-screen-messages">
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className="message-group">
                    <div className="message user-message">
                      <span className="message-content">{chat.question}</span>
                    </div>
                    <div className="message ai-message">
                      <div className="message-content-wrapper">
                        {chat.response ? (
                          <>
                            <span className="message-content">{chat.response.content || chat.response.text_answer}</span>
                            {chat.response.table_data && (
                              <div className="table-container">
                                <pre className="table-data">
                                  {JSON.stringify(chat.response.table_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {chat.response.graph_needed === 'yes' && (
                              <div className="chart-wrapper">
                                {renderChart(chat.response)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="message-content thinking">
                            <span className="dot-typing"></span> Thinking...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="chat-input-container">
              <div className="chat-input">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={handleTextareaChange}
                  placeholder="Ask another question..."
                  disabled={loading}
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={loading}
                  className="action-btn send-btn"
                  aria-label="Send message"
                >
                  {loading ? <span className="spinner"></span> : <img src="/Assets/send.png" alt="Send" className="send-icon" />}
                </button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
        ) : (
          <>
            <h1>Welcome to People's Leasing AI Investor Assistant</h1>
            <h3>I'm here to help you with information about our financial and business performance</h3>

            <div className="categories">
              <div className="category">
                <div className="category-header">
                  <img src="/Assets/Growth.png" alt="Growth Icon" className="icon" />
                  <h2>Growth</h2>
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("How did the overall business performance of the company grow during 2024/25?")}>
                  How did the overall business performance of the company grow during 2024/25?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What were the key drivers of the company’s growth in FY2024/25?")}>
                  What were the key drivers of the company’s growth in FY2024/25?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What is the growth outlook for the next year?")}>
                  What is the growth outlook for the next year?
                </div>
              </div>

              <div className="category">
                <div className="category-header">
                  <img src="/Assets/Profitability.png" alt="Profitability Icon" className="icon" />
                  <h2>Profitability</h2>
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What was the company’s profitability in 2024/25 compared to the previous year?")}>
                  What was the company’s profitability in 2024/25 compared to the previous year?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What is the ROE in 2024/25 and how does it compare to the previous year?")}>
                  What is the ROE in 2024/25 and how does it compare to the previous year?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What is the dividend payout of the company in 2024/25?")}>
                  What is the dividend payout of the company in 2024/25?
                </div>
              </div>

              <div className="category">
                <div className="category-header">
                  <img src="/Assets/Asset Quality.png" alt="Asset Quality Icon" className="icon" />
                  <h2>Asset Quality</h2>
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What is the credit rating of the company?")}>
                  What is the credit rating of the company?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("How effective were the company’s collection efforts during 2024/25?")}>
                  How effective were the company’s collection efforts during 2024/25?
                </div>
                <div className="question-box" onClick={() => handleAskQuestion("What is the total impairment charge reported for 2024/25, and what were the main drivers behind it?")}>
                  What is the total impairment charge for 2024/25 and its main drivers??
                </div>
              </div>
            </div>

            <div className="home-chat-input-container">
              <div className="chat-input">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={handleTextareaChange}
                  placeholder="Ask a question about our financial performance..."
                  disabled={loading}
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={loading}
                  className="action-btn send-btn"
                  aria-label="Send message"
                >
                  {loading ? <span className="spinner"></span> : <img src="/Assets/send.png" alt="Send" className="send-icon" />}
                </button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;