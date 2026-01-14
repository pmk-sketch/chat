import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

/**
 * 실시간 채팅 애플리케이션 메인 컴포넌트
 */
function App() {
    const [messages, setMessages] = useState([]) // 채팅 메시지 목록 상태
    const [nickname, setNickname] = useState('') // 입력 중인 닉네임
    const [pin, setPin] = useState('') // 입력 중인 PIN
    const [isNicknameSet, setIsNicknameSet] = useState(false) // 로그인 성공 여부
    const [inputMessage, setInputMessage] = useState('') // 전송할 메시지
    const [selectedAvatar, setSelectedAvatar] = useState('🐱') // 신규 가입 시 선택한 아바타
    const [loginStep, setLoginStep] = useState('NICKNAME') // NICKNAME -> PIN_ENTRY or REGISTER
    const [userData, setUserData] = useState(null) // 현재 로그인한 유저 정보
    const [viewingProfile, setViewingProfile] = useState(null) // 현재 조회 중인 다른 유저 정보
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false) // 내 프로필 수정 모달
    const [statusInput, setStatusInput] = useState('') // 상태 메시지 입력값

    const messagesEndRef = useRef(null)
    const avatars = ['🐱', '🐶', '🦊', '🦁', '🐸', '🐼', '🦄', '🐲']

    // 초기 로드 및 실시간 구독
    useEffect(() => {
        fetchMessages()
        const channel = supabase
            .channel('chatlog-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chatlog' },
                (payload) => setMessages((prev) => [...prev, payload.new]))
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    useEffect(() => { scrollToBottom() }, [messages])

    // 메시지 불러오기
    const fetchMessages = async () => {
        const { data, error } = await supabase.from('chatlog').select('*').order('created_at', { ascending: true })
        if (!error) setMessages(data)
    }

    // 로그인 - 닉네임 확인 단계
    const handleNicknameSubmit = async (e) => {
        e.preventDefault()
        if (!nickname.trim()) return

        const { data, error } = await supabase.from('chat_users').select('*').eq('nickname', nickname).single()

        if (error && error.code !== 'PGRST116') { // PGRST116: 결과 없음
            alert('데이터베이스 연결 오류가 발생했습니다.')
            return
        }

        if (data) {
            // 기존 유저 -> PIN 입력 단계로
            setUserData(data)
            setLoginStep('PIN_ENTRY')
        } else {
            // 신규 유저 -> 회원가입 단계로
            setLoginStep('REGISTER')
        }
    }

    // 로그인 - PIN 확인 단계 (기존 유저)
    const handlePinSubmit = async (e) => {
        e.preventDefault()
        if (pin === userData.pin) {
            setIsNicknameSet(true)
            setStatusInput(userData.status_message)
        } else {
            alert('PIN 번호가 일치하지 않습니다.')
            setPin('')
        }
    }

    // 회원가입 (신규 유저)
    const handleRegister = async (e) => {
        e.preventDefault()
        if (pin.length !== 4) return alert('PIN 번호는 4자리여야 합니다.')

        const { data, error } = await supabase.from('chat_users').insert([
            { nickname, avatar: selectedAvatar, pin, status_message: '' }
        ]).select().single()

        if (error) {
            alert('가입 중 오류가 발생했습니다.')
        } else {
            setUserData(data)
            setIsNicknameSet(true)
            setStatusInput('')
        }
    }

    // 메시지 전송
    const sendMessage = async (e) => {
        e.preventDefault()
        if (!inputMessage.trim()) return
        const { error } = await supabase.from('chatlog').insert([
            { nickname: userData.nickname, contents: inputMessage, avatar: userData.avatar }
        ])
        if (!error) setInputMessage('')
    }

    // 내 프로필 업데이트 (상태 메시지)
    const updateProfile = async () => {
        const { data, error } = await supabase.from('chat_users')
            .update({ status_message: statusInput })
            .eq('nickname', userData.nickname)
            .select().single()

        if (!error) {
            setUserData(data)
            setIsProfileModalOpen(false)
            alert('프로필이 업데이트되었습니다.')
        }
    }

    // 다른 사람 프로필 보기
    const viewUserProfile = async (targetNickname) => {
        const { data, error } = await supabase.from('chat_users').select('*').eq('nickname', targetNickname).single()
        if (!error) setViewingProfile(data)
    }

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    // 로그인 화면 (닉네임/PIN/가입)
    if (!isNicknameSet) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1>CHAT ADVENTURE</h1>
                    {loginStep === 'NICKNAME' && (
                        <form onSubmit={handleNicknameSubmit}>
                            <p>이름을 입력해주세요.</p>
                            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" autoFocus required />
                            <button type="submit" className="start-btn">계속 시작</button>
                        </form>
                    )}
                    {loginStep === 'PIN_ENTRY' && (
                        <form onSubmit={handlePinSubmit}>
                            <p><strong>{nickname}</strong>님, PIN 4자리를 입력해주세요.</p>
                            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="****" maxLength={4} autoFocus required />
                            <button type="submit" className="start-btn">로그인</button>
                            <button type="button" className="text-btn" onClick={() => setLoginStep('NICKNAME')}>뒤로가기</button>
                        </form>
                    )}
                    {loginStep === 'REGISTER' && (
                        <form onSubmit={handleRegister}>
                            <p>처음 오셨군요! 사용할 캐릭터와 PIN 4자리를 설정해주세요.</p>
                            <div className="avatar-selector">
                                {avatars.map(av => (
                                    <button key={av} type="button" className={`avatar-option ${selectedAvatar === av ? 'selected' : ''}`} onClick={() => setSelectedAvatar(av)}>{av}</button>
                                ))}
                            </div>
                            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="로그인 PIN 4자리" maxLength={4} required />
                            <button type="submit" className="start-btn">가입 및 모험 시작</button>
                            <button type="button" className="text-btn" onClick={() => setLoginStep('NICKNAME')}>뒤로가기</button>
                        </form>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="chat-container">
            <header>
                <div className="header-left">
                    <span className="room-icon">🏰</span>
                    <h2>광장 채팅</h2>
                </div>
                <div className="user-status">
                    <button className="profile-btn" onClick={() => setIsProfileModalOpen(true)}>
                        <span className="my-avatar-display">{userData.avatar}</span>
                        <span className="user-name">{userData.nickname}</span>
                    </button>
                </div>
            </header>

            <div className="messages-list">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-item ${msg.nickname === userData.nickname ? 'my-message' : ''}`}>
                        <div className="message-header" onClick={() => viewUserProfile(msg.nickname)} style={{ cursor: 'pointer' }}>
                            <span className="message-avatar">{msg.avatar || '👤'}</span>
                            <span className="message-author">{msg.nickname}</span>
                        </div>
                        <div className="message-bubble">
                            <p className="message-content">{msg.contents}</p>
                            <span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={sendMessage}>
                <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="메시지를 입력해 보세요..." />
                <button type="submit">전송</button>
            </form>

            {/* 내 프로필 수정 모달 */}
            {isProfileModalOpen && (
                <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2>MY PROFILE</h2>
                        <div className="profile-preview">
                            <span className="large-avatar">{userData.avatar}</span>
                            <h3>{userData.nickname}</h3>
                        </div>
                        <div className="input-group">
                            <label>상태 메시지</label>
                            <input
                                type="text"
                                value={statusInput}
                                onChange={e => setStatusInput(e.target.value)}
                                placeholder="어떤 모험을 하고 계신가요?"
                                maxLength={30}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setIsProfileModalOpen(false)}>닫기</button>
                            <button className="save-btn" onClick={updateProfile}>변경사항 저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 상대방 프로필 보기 모달 */}
            {viewingProfile && (
                <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
                    <div className="modal-card profile-view" onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <span className="large-avatar">{viewingProfile.avatar}</span>
                            <h2>{viewingProfile.nickname}</h2>
                        </div>
                        <div className="profile-body">
                            <p className="status-label">MESSAGE</p>
                            <p className="status-text">{viewingProfile.status_message || '이 사용자는 정체를 숨기고 있습니다...'}</p>
                        </div>
                        <div className="modal-actions">
                            <button className="close-btn" onClick={() => setViewingProfile(null)}>확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
