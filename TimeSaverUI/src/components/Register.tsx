import React, { useState } from 'react';
import api from '../api/axiosConfig';
import type { UserRegisterDTO } from '../types/auth';
import './Register.css';

const Register = () => {
    const [formData, setFormData] = useState<UserRegisterDTO>({
        name: '',
        email: '',
        password: '',
        bio: '',
        userType: 'Worker',
    });

    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (fieldErrors[e.target.name]) {
            const newErrors = { ...fieldErrors };
            delete newErrors[e.target.name];
            setFieldErrors(newErrors);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setStatus(null);

        try {
            await api.post('/auth/register', formData);
            setStatus({ type: 'success', msg: 'Account created successfully!' });
        } catch (error: any) {
            if (error.response?.status === 400 && error.response.data.errors) {
                setFieldErrors(error.response.data.errors);
                setStatus({ type: 'error', msg: 'Please fix the errors below.' });
            } else {
                setStatus({ type: 'error', msg: error.response?.data?.message || 'Server error.' });
            }
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>TimeSaver</h2>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="name" onChange={handleChange} className={fieldErrors.Name ? 'input-error' : ''} />
                        {fieldErrors.Name && <span className="error-text">{fieldErrors.Name[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" onChange={handleChange} className={fieldErrors.Email ? 'input-error' : ''} />
                        {fieldErrors.Email && <span className="error-text">{fieldErrors.Email[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" onChange={handleChange} className={fieldErrors.Password ? 'input-error' : ''} />
                        {fieldErrors.Password && <span className="error-text">{fieldErrors.Password[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Short Bio {formData.userType === 'Worker' && <span style={{ color: 'red' }}>*</span>}</label>
                        <textarea name="bio" onChange={handleChange} className={fieldErrors.Bio ? 'input-error' : ''} />
                        {fieldErrors.Bio && <span className="error-text">{fieldErrors.Bio[0]}</span>}
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select name="userType" value={formData.userType} onChange={handleChange}>
                            <option value="Worker">Worker</option>
                            <option value="Employer">Employer</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <button type="submit" className="register-button">Create Account</button>
                </form>

                {status && <div className={`message ${status.type}`}>{status.msg}</div>}
            </div>
        </div>
    );
};

export default Register;