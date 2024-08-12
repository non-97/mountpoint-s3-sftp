#!/usr/bin/env bash

# -x to display the command to be executed
set -xeu

# Redirect /var/log/user-data.log and /dev/console
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

# Declare
readonly bucket_name="_bucket_name_"
readonly mount_dir="/mnt/s3/${bucket_name}"
readonly log_dir="/var/log/amazon/mountpoint-s3"
readonly user_name="sftp-s3"
readonly group_name="${user_name}"
readonly architecture="arm64"

# Add SFTP user
useradd "${user_name}" -U

# Install Mountpoint for Amazon S3
wget https://s3.amazonaws.com/mountpoint-s3-release/latest/${architecture}/mount-s3.rpm
dnf install -y ./mount-s3.rpm

mkdir -p "${mount_dir}"
mkdir -p "${log_dir}"
chown "${user_name}":"${group_name}" "${mount_dir}"
chown "${user_name}":"${group_name}" "${log_dir}"

# Allow other users to access mount
# Needed if --allow-root or --allow-other option is set
if ! grep -q "^user_allow_other" /etc/fuse.conf; then
    echo "user_allow_other" | tee -a /etc/fuse.conf
fi

# Unit file of Mountpoint for Amazon S3
tee /etc/systemd/system/mountpoint-s3-${bucket_name}.service << EOF
[Unit]
ConditionPathExists=/usr/bin/mount-s3
Wants=network-online.target 
After=network-online.target 

[Service]
User=${user_name}
Group=${group_name}
Type=oneshot
RemainAfterExit=yes

ExecStart=/usr/bin/mount-s3 ${bucket_name} ${mount_dir} --allow-delete --allow-overwrite --allow-other -l ${log_dir} --dir-mode 0775 --file-mode 0664
ExecStop=/usr/bin/umount ${mount_dir}

[Install]
WantedBy=multi-user.target
EOF

# Start Mountpoint for Amazon S3 service
systemctl daemon-reload
systemctl list-unit-files --type=service | grep mountpoint
systemctl enable mountpoint-s3-${bucket_name}.service --now

# Set SFTP user
mkdir /home/${user_name}/.ssh
chmod 700 /home/${user_name}/.ssh
touch /home/${user_name}/.ssh/authorized_keys
chmod 600 /home/${user_name}/.ssh/authorized_keys
chown -R ${user_name}:${group_name} /home/${user_name}/.ssh

# Set chroot for SFTP user
tee -a /etc/ssh/sshd_config << EOF
Match Group ${group_name}
        ChrootDirectory /mnt/s3/
        ForceCommand internal-sftp
EOF

systemctl restart sshd