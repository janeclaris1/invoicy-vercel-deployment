import React, { useEffect, useState, useRef, useCallback } from "react";
import { MessageCircle, Send, User, Search, Paperclip, X, FileText, Image as ImageIcon, Users, MoreVertical, Pencil, Trash2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { playNotificationSound } from "../../utils/notificationSound";
import toast from "react-hot-toast";
import moment from "moment";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_ATTACHMENTS = 5;
const ACCEPT_ATTACHMENTS = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

function MessageAttachment({ attachment, isMe }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const fullUrl = `${BASE_URL}/${API_PATHS.MESSAGES.ATTACHMENT(attachment.url)}`;
  const isImage = IMAGE_TYPES.includes(attachment.contentType);

  useEffect(() => {
    let objectUrl;
    axiosInstance.get(fullUrl, { responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fullUrl]);

  if (!blobUrl) {
    return (
      <div className="rounded-lg bg-black/10 dark:bg-black/20 p-2 text-xs text-gray-600 dark:text-slate-400">
        Loading…
      </div>
    );
  }
  if (isImage) {
    return (
      <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 max-w-[200px]">
        <img src={blobUrl} alt={attachment.filename} className="max-h-48 w-auto object-cover" />
      </a>
    );
  }
  return (
    <a href={blobUrl} download={attachment.filename} className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm border ${isMe ? "border-blue-200 text-blue-100" : "border-slate-500 text-slate-300"}`}>
      <FileText className="w-4 h-4 shrink-0" /> {attachment.filename}
    </a>
  );
}

const Messages = () => {
  const { user: currentUser } = useAuth();
  const myId = currentUser?._id;
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupParticipantIds, setGroupParticipantIds] = useState([]);
  const lastPollCountRef = useRef(-1);
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchContacts = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.MESSAGES.CONTACTS);
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load contacts");
      setContacts([]);
    }
  };

  const fetchConversations = async (silent = false) => {
    try {
      const res = await axiosInstance.get(API_PATHS.MESSAGES.CONVERSATIONS);
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setConversations([]);
      if (!silent) toast.error(err.response?.data?.message || "Failed to load conversations");
    }
  };

  const toId = (v) => (v == null ? "" : typeof v === "string" ? v : (v._id != null ? v._id : v).toString());

  const fetchMessages = useCallback(async (sel) => {
    if (!sel) return;
    setLoadingThread(true);
    try {
      const id = toId(sel.id);
      if (!id) {
        setMessages([]);
        return;
      }
      const url = sel.type === "group"
        ? `${API_PATHS.MESSAGES.MESSAGES}?group=${encodeURIComponent(id)}`
        : `${API_PATHS.MESSAGES.MESSAGES}?with=${encodeURIComponent(id)}`;
      const res = await axiosInstance.get(url);
      setMessages(Array.isArray(res.data) ? res.data : []);
      if (sel.type === "user" && id) {
        await axiosInstance.put(API_PATHS.MESSAGES.MARK_READ, { fromUserId: id });
      }
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchContacts(), fetchConversations()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selected) fetchMessages(selected);
  }, [selected?.type, selected?.id]);

  useEffect(() => {
    if (!myId) return;
    const poll = () => {
      axiosInstance.get(API_PATHS.MESSAGES.UNREAD_COUNT).then((res) => {
        const totalUnread = res.data && typeof res.data.count === "number" ? res.data.count : 0;
        const prev = lastPollCountRef.current;
        if (totalUnread > prev && prev >= 0) {
          playNotificationSound(Math.min(totalUnread - prev, 3));
        }
        lastPollCountRef.current = totalUnread;
      }).catch(() => {});
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [myId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => {
      const next = [...prev, ...files].slice(0, MAX_ATTACHMENTS);
      return next;
    });
    e.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const body = newMessage.trim();
    if ((!body && selectedFiles.length === 0) || !selected || sending) return;
    const id = toId(selected.id);
    if (!id) {
      toast.error("Invalid conversation");
      return;
    }
    setSending(true);
    try {
      let res;
      if (selectedFiles.length === 0) {
        const payload = selected.type === "group"
          ? { groupId: id, body }
          : { recipientId: id, body };
        res = await axiosInstance.post(API_PATHS.MESSAGES.SEND, payload);
      } else {
        const formData = new FormData();
        if (selected.type === "group") formData.append("groupId", id);
        else formData.append("recipientId", id);
        formData.append("body", body);
        selectedFiles.forEach((file) => formData.append("attachments", file));
        res = await axiosInstance.post(API_PATHS.MESSAGES.SEND, formData, {
          headers: { "Content-Type": undefined },
          transformRequest: [(data) => data],
        });
      }
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setSelectedFiles([]);
      fetchConversations(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingId || editBody.trim() === "") return;
    try {
      const res = await axiosInstance.put(API_PATHS.MESSAGES.MESSAGE_BY_ID(editingId), { body: editBody.trim() });
      setMessages((prev) => prev.map((m) => (m._id === editingId ? res.data : m)));
      setEditingId(null);
      setEditBody("");
      toast.success("Message updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await axiosInstance.delete(API_PATHS.MESSAGES.MESSAGE_BY_ID(msgId));
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      setMenuOpenId(null);
      fetchConversations(true);
      toast.success("Message deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const res = await axiosInstance.post(API_PATHS.MESSAGES.CREATE_GROUP, { name: groupName.trim(), participantIds: groupParticipantIds });
      setShowCreateGroup(false);
      setGroupName("");
      setGroupParticipantIds([]);
      await fetchConversations();
      if (res.data?._id) setSelected({ type: "group", id: res.data._id });
      toast.success("Group created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  };

  const getOtherUser = (conv) => conv.otherUser;
  const getDisplayName = (u) => (u && (u.name || u.email)) || "Unknown";

  const userConvos = conversations.filter((c) => c.type === "user");
  const groupConvos = conversations.filter((c) => c.type === "group");
  const filteredUserConvos = userConvos.filter((c) => {
    const name = getDisplayName(c.otherUser).toLowerCase();
    const email = (c.otherUser?.email || "").toLowerCase();
    return !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });
  const filteredGroupConvos = groupConvos.filter((c) => {
    const name = (c.group?.name || "").toLowerCase();
    return !searchTerm || name.includes(searchTerm.toLowerCase());
  });
  const filteredConversations = [...filteredUserConvos, ...filteredGroupConvos].sort((a, b) => {
    const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : 0;
    const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : 0;
    return bt - at;
  });

  const selectedConv = selected && (selected.type === "user"
    ? conversations.find((c) => c.type === "user" && (c.otherUser?._id || c.otherUser) === selected.id)
    : conversations.find((c) => c.type === "group" && c.group?._id === selected.id));
  const selectedContact = selected?.type === "user" && selectedConv ? getOtherUser(selectedConv) : (selected?.type === "user" ? contacts.find((c) => c._id === selected.id) : null);
  const selectedGroup = selected?.type === "group" ? (selectedConv?.group || { _id: selected.id, name: "" }) : null;

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Messages</h1>
        <p className="text-gray-600 dark:text-slate-400">Private messaging with your team and staff.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        {/* Conversation list */}
        <div className="md:w-80 flex flex-col border-r border-gray-200 dark:border-slate-700 shrink-0">
          <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 shrink-0"
              title="Create group"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">Loading...</div>
            ) : filteredConversations.length === 0 && contacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">No team members yet. Create a group to start.</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-gray-500 dark:text-slate-400 text-sm">No conversations yet. Select a contact or create a group.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredConversations.map((conv) => {
                  const isUser = conv.type === "user";
                  const key = isUser ? `u-${conv.otherUser?._id || conv.otherUser}` : `g-${conv.group?._id}`;
                  const isSelected = selected && ((isUser && selected.type === "user" && (conv.otherUser?._id || conv.otherUser) === selected.id) || (!isUser && selected.type === "group" && conv.group?._id === selected.id));
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelected(isUser ? { type: "user", id: conv.otherUser?._id || conv.otherUser } : { type: "group", id: conv.group?._id })}
                        className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-900" : ""}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isUser ? "bg-blue-100 dark:bg-blue-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                          {isUser ? <User className="w-5 h-5 text-blue-900 dark:text-blue-300" /> : <Users className="w-5 h-5 text-amber-800 dark:text-amber-300" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {isUser ? getDisplayName(conv.otherUser) : (conv.group?.name || "Group")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {conv.lastMessage?.body || "No messages yet"}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center font-medium">
                            {conv.unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && contacts.length > 0 && (
              <>
                {(filteredUserConvos.length > 0 || filteredGroupConvos.length > 0) && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700">
                    Start a conversation
                  </div>
                )}
                {contacts
                  .filter((c) => !userConvos.some((conv) => (conv.otherUser?._id || conv.otherUser) === c._id))
                  .filter((c) => !searchTerm || getDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase()) || (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((c) => {
                    const isSelected = selected?.type === "user" && selected?.id === c._id;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => setSelected({ type: "user", id: c._id })}
                        className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-900" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{getDisplayName(c)}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">No messages yet</p>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400 p-6">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversation or choose a contact to start messaging.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected.type === "group" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                  {selected.type === "group" ? <Users className="w-4 h-4 text-amber-800 dark:text-amber-300" /> : <User className="w-4 h-4 text-blue-900 dark:text-blue-300" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selected.type === "group" ? (selectedGroup?.name || "Group") : getDisplayName(selectedContact)}
                  </p>
                  {selected.type === "user" && selectedContact?.email && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{selectedContact.email}</p>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingThread ? (
                  <div className="text-center text-gray-500 dark:text-slate-400 py-8">Loading...</div>
                ) : (
                  messages.map((m) => {
                    const isMe = (m.sender?._id || m.sender) === myId;
                    const statusText = isMe && !m.group
                      ? (m.readAt ? "Read" : m.deliveredAt ? "Delivered" : "Sent")
                      : "";
                    return (
                      <div
                        key={m._id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-4 py-2 relative group ${
                            isMe
                              ? "bg-blue-900 text-white rounded-br-md"
                              : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md"
                          }`}
                        >
                          {editingId === m._id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1 text-sm rounded border border-blue-700 bg-blue-950 text-white"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={handleEditMessage} className="text-xs px-2 py-1 bg-blue-700 rounded">Save</button>
                                <button type="button" onClick={() => { setEditingId(null); setEditBody(""); }} className="text-xs px-2 py-1 rounded border">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {m.body ? <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p> : null}
                              {m.editedAt && <p className="text-xs opacity-80">(edited)</p>}
                              {m.attachments?.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {m.attachments.map((att, i) => (
                                    <MessageAttachment key={i} attachment={att} isMe={isMe} />
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className={`text-xs ${isMe ? "text-blue-200" : "text-gray-500 dark:text-slate-400"}`}>
                                  {moment(m.createdAt).format("MMM D, h:mm A")}
                                  {!isMe && m.readAt && " · Read"}
                                  {statusText && ` · ${statusText}`}
                                </p>
                                {isMe && (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setMenuOpenId(menuOpenId === m._id ? null : m._id)}
                                      className="p-0.5 rounded hover:bg-black/20"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                    {menuOpenId === m._id && (
                                      <>
                                        <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-10 min-w-[100px]">
                                          <button type="button" onClick={() => { setEditingId(m._id); setEditBody(m.body || ""); setMenuOpenId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <Pencil className="w-4 h-4" /> Edit
                                          </button>
                                          <button type="button" onClick={() => handleDeleteMessage(m._id)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="w-4 h-4" /> Delete
                                          </button>
                                        </div>
                                        <div className="fixed inset-0 z-0" onClick={() => setMenuOpenId(null)} aria-hidden="true" />
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-slate-700">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTACHMENTS}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1 text-sm text-gray-700 dark:text-slate-300">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button type="button" onClick={() => removeSelectedFile(i)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500" aria-label="Remove">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 shrink-0"
                    title="Add file or image"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && selectedFiles.length === 0) || !selected}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-800 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Create Group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-slate-700 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="e.g. Sales Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Add members</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-lg p-2 space-y-1">
                  {contacts.map((c) => (
                    <label key={c._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={groupParticipantIds.includes(c._id)}
                        onChange={(e) => setGroupParticipantIds((prev) => e.target.checked ? [...prev, c._id] : prev.filter((id) => id !== c._id))}
                        className="rounded border-gray-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{getDisplayName(c)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 border border-blue-800">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateGroup(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
